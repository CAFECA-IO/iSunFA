import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File as FormidableFile } from 'formidable';
import { promises as fs } from 'fs';

import path from 'path';

// Info: (20241007 - tzuhan) 禁用內建的 body 解析
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const form = new IncomingForm({
      uploadDir: path.join(process.cwd(), '/tmp'),
      keepExtensions: true, // Info: (20241007 - tzuhan) 保留文件擴展名
    });

    // Deprecated: (20241011 - tzuhan) Debugging purpose
    // eslint-disable-next-line no-console
    console.log('form:', form);

    form.parse(req, async (err, fields, files) => {
      if (err) {
        // Deprecated: (20241011 - tzuhan) Debugging purpose
        // eslint-disable-next-line no-console
        console.error('Error parsing the files:', err);
        return res.status(500).json({ message: 'File upload error' });
      }

      // Deprecated: (20241011 - tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.log('files:', files);

      // Info: (20241007 - tzuhan) 處理多個文件
      const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files]; // 確保它是數組

      const uploadDir = path.join(process.cwd(), '/public/uploads');
      await fs.mkdir(uploadDir, { recursive: true }); // Info: (20241007 - tzuhan) 確保上傳目錄存在

      // Info: (20241007 - tzuhan) 生成每個文件的 URL 和 token
      const certificates = await Promise.all(
        uploadedFiles
          .filter((file: FormidableFile | undefined) => !!file)
          .map(async (file: FormidableFile) => {
            const tempFilePath = file.filepath;
            const fileName = `${Date.now()}_${file.originalFilename}`;
            const finalFilePath = path.join(uploadDir, fileName);

            await fs.rename(tempFilePath, finalFilePath); // Info: (20241007 - tzuhan) 將文件移動到最終目錄

            const fileUrl = `/uploads/${fileName}`; // Info: (20241007 - tzuhan) 文件的相對 URL

            return {
              fileUrl,
            };
          })
      );

      return res.status(200).json({ certificates });
    });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
