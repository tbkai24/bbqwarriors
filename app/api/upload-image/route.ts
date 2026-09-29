import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || 'bbqwarriors_preset';

    if (!cloudName) {
      return NextResponse.json(
        { error: 'Image upload service is not configured properly.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'BBQWarriors/uploads';

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    let base64Data: string;
    if (typeof file === 'string') {
      base64Data = file;
    } else {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = file.type || 'image/jpeg';
      base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', base64Data);

    if (apiSecret && apiKey && cloudName) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

      uploadFormData.append('api_key', apiKey);
      uploadFormData.append('timestamp', timestamp);
      uploadFormData.append('folder', folder);
      uploadFormData.append('signature', signature);
    } else {
      uploadFormData.append('upload_preset', uploadPreset);
      uploadFormData.append('folder', folder);
    }

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: uploadFormData,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Cloudinary upload failed' }, { status: 500 });
    }

    return NextResponse.json({
      url: data.secure_url,
      public_id: data.public_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server upload error' }, { status: 500 });
  }
}
