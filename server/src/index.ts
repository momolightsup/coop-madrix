import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseMadrixCsv, ColumnMapping } from './patchParser.js';
import { RenderService } from './renderService.js';
import { PatchData, VideoSettings, ExclusionFilters, EffectType, AnyEffectParams } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const rendersDir = path.resolve(projectRoot, 'data/renders');
const presetsFile = path.resolve(projectRoot, 'data/presets.json');

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Set up Multer for CSV uploads
const upload = multer({ dest: path.join(projectRoot, 'data/uploads') });
const renderService = new RenderService(rendersDir);

// Initialize presets file if needed
if (!fs.existsSync(path.dirname(presetsFile))) {
  fs.mkdirSync(path.dirname(presetsFile), { recursive: true });
}
if (!fs.existsSync(presetsFile)) {
  fs.writeFileSync(presetsFile, JSON.stringify([], null, 2), 'utf-8');
}

// 1. Load default patch (Letzipark Façade)
app.get('/api/patch/default', (_req, res) => {
  try {
    const defaultPatchPath = path.resolve(
      projectRoot,
      'Patch/letzi-fassade-west+sued_ho-ve_live1.csv'
    );
    if (!fs.existsSync(defaultPatchPath)) {
      return res.status(404).json({ error: 'Default patch file not found' });
    }

    const csvContent = fs.readFileSync(defaultPatchPath, 'utf-8');
    const patchData = parseMadrixCsv(csvContent, 'letzi-fassade-west+sued_ho-ve_live1.csv');
    res.json(patchData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to parse default patch' });
  }
});

// 2. Upload and parse new patch
app.post('/api/patch/upload', upload.single('patchFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const customMapping: ColumnMapping | undefined = req.body.mapping
      ? JSON.parse(req.body.mapping)
      : undefined;
    const delimiter = req.body.delimiter || undefined;

    const patchData = parseMadrixCsv(
      csvContent,
      req.file.originalname,
      customMapping,
      delimiter
    );

    // Save copy to data/patches
    const patchesDir = path.resolve(projectRoot, 'data/patches');
    if (!fs.existsSync(patchesDir)) fs.mkdirSync(patchesDir, { recursive: true });
    fs.copyFileSync(req.file.path, path.join(patchesDir, req.file.originalname));

    res.json(patchData);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to parse CSV' });
  }
});

// 3. Inspect headers for column mapping helper
app.post('/api/patch/inspect', upload.single('patchFile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const firstLine = content.split(/\r?\n/)[0] || '';
    const delimiter = firstLine.includes(';') ? ';' : ',';
    const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
    res.json({ delimiter, headers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Start Render
app.post('/api/render/start', async (req, res) => {
  try {
    const {
      patch,
      videoSettings,
      exclusions,
      effectType,
      params,
    }: {
      patch: PatchData;
      videoSettings: VideoSettings;
      exclusions: ExclusionFilters;
      effectType: EffectType;
      params: AnyEffectParams;
    } = req.body;

    if (!patch || !patch.fixtures || patch.fixtures.length === 0) {
      return res.status(400).json({ error: 'Valid patch with fixtures is required' });
    }

    const jobId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const status = await renderService.startRender(
      jobId,
      patch,
      videoSettings,
      exclusions,
      effectType,
      params
    );

    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start render' });
  }
});

// 5. Check Render Status
app.get('/api/render/status/:jobId', (req, res) => {
  const status = renderService.getJobStatus(req.params.jobId);
  if (!status) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(status);
});

// 6. Cancel Render
app.post('/api/render/cancel/:jobId', (req, res) => {
  const success = renderService.cancelJob(req.params.jobId);
  res.json({ cancelled: success });
});

// 7. Download Rendered Video
app.get('/api/render/download/:filename', (req, res) => {
  const filePath = path.join(rendersDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.download(filePath);
});

// 8. Presets API
app.get('/api/presets', (_req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(presetsFile, 'utf-8'));
    res.json(data);
  } catch {
    res.json([]);
  }
});

app.post('/api/presets', (req, res) => {
  try {
    const newPreset = req.body;
    let list: any[] = [];
    if (fs.existsSync(presetsFile)) {
      list = JSON.parse(fs.readFileSync(presetsFile, 'utf-8'));
    }
    // Update or insert
    const idx = list.findIndex((p: any) => p.name === newPreset.name);
    if (idx !== -1) {
      list[idx] = newPreset;
    } else {
      list.push(newPreset);
    }
    fs.writeFileSync(presetsFile, JSON.stringify(list, null, 2), 'utf-8');
    res.json({ success: true, presets: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`[MADRIX Light Studio] Backend listening on http://localhost:${port}`);
});
