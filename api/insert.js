const sql        = require('mssql');
const { ClientSecretCredential } = require('@azure/identity');

// Fail fast if any required env var is missing — surfaces in Vercel logs
const REQUIRED_ENV = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'SYNAPSE_SERVER', 'SYNAPSE_DB'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);

// Myanmar Time = UTC+6:30
function toMMT(date) { return new Date(date.getTime() + 390 * 60 * 1000); }

let credential   = null;
let pool         = null;
let tokenExpiry  = 0;

if (!missingEnv.length) {
  credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );
}

async function getPool() {
  const now = Date.now();

  // Refresh if token expires within 5 minutes
  if (pool && tokenExpiry - now > 5 * 60 * 1000) return pool;

  // Close stale pool if any
  if (pool) { try { await pool.close(); } catch (_) {} pool = null; }

  const tokenRes = await credential.getToken('https://database.windows.net/.default');
  tokenExpiry = tokenRes.expiresOnTimestamp;

  pool = await new sql.ConnectionPool({
    server:   process.env.SYNAPSE_SERVER,
    port:     1433,
    database: process.env.SYNAPSE_DB,
    options: {
      encrypt:                true,
      trustServerCertificate: true,
      enableArithAbort:       true,
      connectTimeout:         30000,
      requestTimeout:         30000,
    },
    authentication: {
      type:    'azure-active-directory-access-token',
      options: { token: tokenRes.token },
    },
    pool: { max: 3, min: 0, idleTimeoutMillis: 30000 },
  }).connect();

  return pool;
}

module.exports = async function handler(req, res) {
  const origin = process.env.CORS_ORIGIN || 'https://unlessyuriko.github.io';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  if (missingEnv.length) {
    return res.status(500).json({ error: `Missing environment variables: ${missingEnv.join(', ')}` });
  }

  const { session, kegs, submittedBy } = req.body || {};

  if (!session || !Array.isArray(kegs) || kegs.length === 0) {
    return res.status(400).json({ error: 'session and kegs[] are required' });
  }

  const now  = toMMT(new Date());
  const by   = (submittedBy || 'KegScanApp').slice(0, 100);

  // Session-level values (same for every row in this batch)
  const truck       = (session.truckNumber || '').slice(0, 50) || null;
  const shipTo      = (session.shipTo      || '').slice(0, 100) || null;
  const lsp         = (session.lsp         || '').slice(0, 100) || null;
  const scannedDate = session.date ? new Date(session.date + 'T00:00:00') : null;

  try {
    const db = await getPool();

    for (const keg of kegs) {
      // Build MMT time string (HH:mm:ss) from the ISO timestamp
      let timeVal = null;
      if (keg.timestamp) {
        const d = toMMT(new Date(keg.timestamp));
        timeVal = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
      }

      await db.request()
        .input('Edit_Status',      sql.VarChar(50),  (keg.status  || 'ok').slice(0, 50))
        .input('Lot_Number',       sql.VarChar(50),  (keg.lotNumber  || '').slice(0, 50)  || null)
        .input('Brand',            sql.VarChar(100), (keg.brand      || '').slice(0, 100) || null)
        .input('Best_Before',      sql.Date,         keg.bestBefore ? new Date(keg.bestBefore + 'T00:00:00') : null)
        .input('Keg_Size',         sql.VarChar(50),  (keg.kegSize    || '').slice(0, 50)  || null)
        .input('TRUCK',            sql.VarChar(50),  truck)
        .input('Scanned_Date',     sql.Date,         scannedDate)
        .input('Ship_To',          sql.VarChar(100), shipTo)
        .input('LSP',              sql.VarChar(100), lsp)
        .input('Time',             sql.VarChar(8),   timeVal)
        .input('Production_Date',  sql.Date,         keg.productionDate ? new Date(keg.productionDate + 'T00:00:00') : null)
        .input('Circulation_Time', sql.Int,          Number.isFinite(keg.circulationDays) ? keg.circulationDays : null)
        .input('CT_Data_Validation', sql.VarChar(50), (keg.ctDataValidation || '').slice(0, 50) || null)
        .input('Created_By',       sql.VarChar(100), by)
        .input('Created_Date',     sql.DateTime2,    now)
        .input('Modified_Date',    sql.DateTime2,    now)
        .query(`
          INSERT INTO [stg].[KegScan]
            ([Edit_Status],[Lot_Number],[Brand],[Best_Before],[Keg_Size],
             [TRUCK],[Scanned_Date],[Ship_To],[LSP],[Time],
             [Production_Date],[Circulation_Time],[CT_Data_Validation],
             [Created_By],[Created_Date],[Modified_Date])
          VALUES
            (@Edit_Status,@Lot_Number,@Brand,@Best_Before,@Keg_Size,
             @TRUCK,@Scanned_Date,@Ship_To,@LSP,@Time,
             @Production_Date,@Circulation_Time,@CT_Data_Validation,
             @Created_By,@Created_Date,@Modified_Date)
        `);
    }

    return res.status(200).json({ ok: true, inserted: kegs.length });

  } catch (err) {
    console.error('Synapse insert error:', err.name, err.message, err.code);
    pool = null; tokenExpiry = 0; // reset on error so next call reconnects
    return res.status(500).json({ error: err.message, code: err.code, name: err.name });
  }
};
