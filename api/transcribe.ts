import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    
    const [fields, files] = await form.parse(req);
    const audioFile = files.file?.[0];

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Create form data for OpenAI
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFile.filepath), {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    // Clean up temp file
    fs.unlinkSync(audioFile.filepath);

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    const result = await response.json();
    return res.status(200).json({ text: result.text });

  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({ error: error.message });
  }
}
