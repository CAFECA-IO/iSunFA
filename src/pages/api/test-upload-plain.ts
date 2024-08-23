/* eslint-disable */
import { FileFolder } from './../../constants/file';
import { parseForm } from './../../lib/utils/parse_image_form';
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function getImageFileAndFormFromFormData(req: NextApiRequest) {
  let files: formidable.Files = {};
  let fields: formidable.Fields = {};

  try {
    const parsedForm = await parseForm(req, FileFolder.INVOICE);
    files = parsedForm.files;
    fields = parsedForm.fields;
  } catch (error) {
    console.log(error);
  }
  return {
    files,
    fields,
  };
}

const saveFile = async (file: formidable.File, imageName: string): Promise<void> => {
  const data = fs.readFileSync(file.filepath);
  const uploadDirectory = path.join(process.cwd(), '', 'tmp');
  if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
  }
  const filePath = path.join(uploadDirectory, imageName);
  fs.writeFileSync(filePath, data);
  await fs.unlinkSync(file.filepath);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { files, fields } = await getImageFileAndFormFromFormData(req);

    console.log('files', files);
    console.log('fields', fields);

    if (!files.image) {
      res.status(400).json({ error: 'Missing image file' });
      return;
    }

    const images = Array.isArray(files.image) ? files.image : [files.image];
    const imageNames = Array.isArray(fields.imageName) ? fields.imageName : [fields.imageName];
    const imageSizes = Array.isArray(fields.imageSize) ? fields.imageSize : [fields.imageSize];
    const uploadIdentifiers = Array.isArray(fields.uploadIdentifier)
      ? fields.uploadIdentifier
      : [fields.uploadIdentifier];
    let imageName = '';
    let imageSize = '';
    let uploadIdentifier = '';

    try {
      await Promise.all(
        images.map(async (image, index) => {
          imageName = imageNames[index] || '';
          imageSize = imageSizes[index] || '';
          uploadIdentifier = uploadIdentifiers[index] || '';

          console.log('In testUploadPlain, image', image, imageName, imageSize, uploadIdentifier);

          if (!image || !imageName) {
            throw new Error('Missing required fields');
          }

          const imageFile = files?.image && files.image[index]; // 確保使用正確的檔案類型
          console.log('imageFile', imageFile);
          if (!imageFile) {
            throw new Error('Missing image file');
          }
          await saveFile(imageFile, imageName);
        })
      );

      res.status(200).json({
        message: 'Files uploaded successfully',
        fileNames: imageName,
        fileSizes: imageSize,
        uploadIdentifiers: uploadIdentifier,
      });
    } catch (error) {
      console.error('Error saving files:', error);
      res.status(500).json({ error: 'Failed to save files' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
