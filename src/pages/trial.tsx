/* eslint-disable */
import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect } from 'react';
import {
  addItem,
  getItem,
  updateItem,
  deleteItem,
  initDB,
  addElements,
  getAllItems,
  clearAllItems,
  updateAndDeleteOldItems,
} from '@/lib/utils/indexed_db/ocr';
import { getTimestampNow, transformBytesToFileSizeString } from '@/lib/utils/common';
import { Button } from '@/components/button/button';
import {
  decrypt,
  decryptFile,
  encrypt,
  encryptFile,
  exportPrivateKey,
  exportPublicKey,
  generateKeyPair,
  importPrivateKey,
  importPublicKey,
} from '@/lib/utils/crypto';
import { IOCRItem, IOCRItemDB } from '@/interfaces/indexed_db_item';

interface FileInfo {
  file: File;
  name: string;
  size: string;
}

const Trial = () => {
  const [itemData, setItemData] = useState<any>(null);
  const [isDBReady, setIsDBReady] = useState(false);
  const [allItems, setAllItems] = useState<IOCRItemDB[]>([]);
  const [uploadFile, setUploadFile] = useState<FileInfo | null>(null);

  useEffect(() => {
    const initializeDB = async () => {
      await initDB();
      setIsDBReady(true);
    };
    initializeDB();
  }, []);

  useEffect(() => {
    if (isDBReady) {
      handleReadAll();
    }
  }, [isDBReady]);

  // Info: 加密解密
  const handleFileChangeWithEncrypt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const { files } = event.target;
    if (files && files.length > 0) {
      const file = files[0];
      const fileSize = transformBytesToFileSizeString(file.size);
      const uuid = uuidv4();

      setUploadFile({
        file,
        name: file.name,
        size: fileSize,
      });

      const iv = crypto.getRandomValues(new Uint8Array(12));

      // 讀取文件內容為 ArrayBuffer
      const fileArrayBuffer = await file.arrayBuffer();

      console.log('fileArrayBuffer', fileArrayBuffer);

      // 生成 RSA 密鑰對
      const keyPair = await generateKeyPair();
      const publicKey = await exportPublicKey(keyPair.publicKey);
      const privateKey = await exportPrivateKey(keyPair.privateKey);

      console.log('publicKey', publicKey);
      console.log('privateKey', privateKey);
      console.log('keyPair', keyPair);

      // 使用混合加密方法加密文件
      const { encryptedContent, encryptedSymmetricKey } = await encryptFile(
        fileArrayBuffer,
        await importPublicKey(publicKey),
        iv
      );

      console.log('encryptedContent', encryptedContent);
      console.log('encryptedSymmetricKey', encryptedSymmetricKey);

      // 將加密後的文件數據存儲到 IndexedDB
      const now = getTimestampNow();
      const testId = `${uuid}`;
      const testData: IOCRItem = {
        name: file.name,
        size: fileSize,
        type: file.type,
        encryptedContent: encryptedContent,

        timestamp: now,
        uploadIdentifier: uuid,
        encryptedSymmetricKey: encryptedSymmetricKey,
        publicKey: publicKey,
        privateKey: privateKey,
        companyId: now,
        iv,
        userId: 123,
      };
      await addItem(testId, testData);
      console.log('Encrypted file data added to DB');
    }
  };

  const handleUploadToAPIWithEncrypt = async () => {
    if (!isDBReady) return;
    const items = await getAllItems();
    for (const { id, ...data } of items) {
      const formData = new FormData();
      console.log('data in handleUploadToAPIWithEncrypt', data);

      const file = new File([data.data.encryptedContent], data.data.name, { type: data.data.type });

      formData.append('image', file);
      formData.append('imageSize', data.data.size);
      formData.append('imageName', data.data.name);
      formData.append('uploadIdentifier', data.data.uploadIdentifier);
      // formData.append('privateKey', data.data.privateKey);
      // formData.append('iv', data.data.iv);
      formData.append('encryptedSymmetricKey', data.data.encryptedSymmetricKey);
      formData.append('privateKey', JSON.stringify(data.data.privateKey)); // FIXME: privateKey 應該從後端的另一隻 API 來，不需要透過前端傳給後端
      formData.append('iv', Array.from(data.data.iv).join(',')); // 將 Uint8Array 轉換為逗號分隔的字串

      try {
        const response = await fetch('/api/test-upload-crypto', {
          // const response = await fetch('/api/test-upload-plain', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        await deleteItem(data.data.uploadIdentifier);
        await handleReadAll();
        console.log(`Uploaded ${data.data.name} to API`, responseData);
      } catch (error) {
        console.error('Error uploading to API:', error);
      }
    }
  };

  const handleUploadToAPIWithDecrypt = async () => {
    if (!isDBReady) return;
    const items = await getAllItems();
    for (const { id, ...data } of items) {
      const formData = new FormData();
      console.log('data in handleUploadToAPIWithDecrypt', data);

      const decryptedContent = await decryptFile(
        data.data.encryptedContent,
        data.data.encryptedSymmetricKey,
        await importPrivateKey(data.data.privateKey),
        data.data.iv
      );

      console.log('decryptedContent', decryptedContent);
      const file = new File([decryptedContent], data.data.name, { type: data.data.type });

      // const file = new File([data.data.encryptedContent], data.data.name, { type: data.data.type });

      formData.append('image', file);
      formData.append('imageSize', data.data.size);
      formData.append('imageName', data.data.name);
      formData.append('uploadIdentifier', data.data.uploadIdentifier);

      try {
        const response = await fetch('/api/test-upload-plain', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        await deleteItem(data.data.uploadIdentifier);
        await handleReadAll();
        console.log(`Uploaded ${data.data.name} to API`, responseData);
      } catch (error) {
        console.error('Error uploading to API:', error);
      }
    }
  };
  const handleUpdateAndDeleteOld = async () => {
    if (!isDBReady) return;
    const maxAgeInMinutes = 1; // 設定最大存在時間為 10 分鐘
    await updateAndDeleteOldItems(maxAgeInMinutes);
    await handleReadAll(); // 更新後重新讀取所有項目
  };

  // const handleMultiFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   event.preventDefault();
  //   const { files } = event.target;
  //   if (files && files.length > 0) {
  //     const now = getTimestampNow();
  //     const elements = [];

  //     for (const file of Array.from(files)) {
  //       const uuid = uuidv4();
  //       const fileSize = transformBytesToFileSizeString(file.size);
  //       const testId = `userId-${now}-${file.name}`; // 使用當前時間戳和文件名作為唯一 ID
  //       const fileArrayBuffer = await file.arrayBuffer();
  //       const testData = {
  //         name: file.name,
  //         size: fileSize,
  //         timestamp: now,
  //         uploadIdentifier: uuid,
  //         type: file.type,
  //         fileData: fileArrayBuffer,
  //         companyId: 'c-2',
  //       }; // 將文件轉換為 ArrayBuffer
  //       elements.push({ id: testId, data: testData });
  //     }

  //     await addElements(elements); // 將所有文件數據存儲到 IndexedDB
  //     console.log('Multiple file data added to DB');
  //   }
  // };

  // const handleUploadToAPI = async () => {
  //   if (!isDBReady) return;
  //   const items = await getAllItems();
  //   for (const item of items) {
  //     const formData = new FormData();
  //     const file = new File([item.data.fileData], item.data.name, { type: item.data.type });

  //     formData.append('image', file);
  //     formData.append('imageSize', item.data.size);
  //     formData.append('imageName', item.data.name);
  //     formData.append('uploadIdentifier', item.data.uploadIdentifier);

  //     console.log('uploadFile in handleUploadToAPI', uploadFile);

  //     try {
  //       const response = await fetch('/api/test-upload-plain', {
  //         method: 'POST',
  //         body: formData,
  //       });

  //       if (!response.ok) {
  //         throw new Error(`HTTP error! status: ${response.status}`);
  //       }

  //       const responseData = await response.json();
  //       console.log(`Uploaded ${item.data.name} to API`, responseData);
  //     } catch (error) {
  //       console.error('Error uploading to API:', error);
  //     }
  //   }
  // };

  // const handleCreate = async () => {
  //   if (!isDBReady) return;
  //   const now = getTimestampNow();
  //   const testId = 'test-id';
  //   const testData = { name: 'Create Data', timestamp: now };
  //   await addItem(testId, testData);
  //   console.log('Item added');
  // };

  // const handleCreateElements = async () => {
  //   if (!isDBReady) return;
  //   const now = getTimestampNow();
  //   const elements = [];
  //   for (let i = 0; i < 10; i++) {
  //     const testId = `test-id-${i}`;
  //     const testData = { name: `Create Data ${i}`, timestamp: now };
  //     elements.push({ id: testId, data: testData });
  //   }
  //   await addElements(elements);
  //   console.log('Elements added');
  // };

  // const handleRead = async () => {
  //   if (!isDBReady) return;
  //   const testId = 'test-id';
  //   const item = await getItem(testId);
  //   setItemData(item);
  //   console.log('Item fetched:', item);
  // };

  // const handleUpdate = async () => {
  //   if (!isDBReady) return;
  //   const now = getTimestampNow();
  //   const testId = 'test-id';
  //   const updatedData = { name: 'Updated Data', timestamp: now };
  //   await updateItem(testId, updatedData);
  //   console.log('Item updated');
  // };

  const handleReadAll = async () => {
    if (!isDBReady) return;
    const items = await getAllItems();
    setAllItems(items);
    console.log('Items fetched:', items);
  };

  const handleDelete = async () => {
    if (!isDBReady) return;
    const testId = 'test-id';
    await deleteItem(testId);
    setItemData(null);
    console.log('Item deleted');
  };

  const handleClear = async () => {
    if (!isDBReady) return;
    await clearAllItems();
    // await handleReadAll();
    console.log('Item deleted');
  };

  const handleDeleteCertainItem = async () => {
    if (!isDBReady) return;
    await deleteItem(allItems[0].data.uploadIdentifier);
    await handleReadAll();
  };

  if (!isDBReady) {
    return <div>正在初始化資料庫...</div>;
  }

  return (
    <div className="p-5">
      <div className="flex flex-col gap-10">
        <div className="flex w-full justify-between">
          <div>
            <p>單一上傳</p>{' '}
            <input
              id="journal-upload-area"
              name="journal-upload-area"
              accept="image/*,application/pdf"
              type="file"
              className=""
              // onChange={handleFileChange}
              onChange={handleFileChangeWithEncrypt}
            />{' '}
          </div>
          {/* <div>
            <p>批量上傳</p>
            <input
              id="multi-upload-area"
              name="multi-upload-area"
              accept="image/*,application/pdf"
              type="file"
              multiple
              className=""
              onChange={handleMultiFileChange} // 更新事件處理器
            />
          </div> */}

          {/* {uploadFile && <p>{uploadFile.name}</p>} */}
        </div>

        <div className="">
          <div className="flex gap-5">
            {' '}
            {/* <Button type="button" onClick={handleCreateElements}>
              Create Elements
            </Button>{' '} */}
            <Button type="button" onClick={handleReadAll}>
              Read All
            </Button>
            <Button
              type="button"
              onClick={handleUploadToAPIWithEncrypt}
              // onClick={handleUploadToAPIWithDecrypt}
              // onClick={handleUploadToAPI}
            >
              Upload to API
            </Button>
            <Button type="button" onClick={handleClear}>
              Clear
            </Button>
            <Button type="button" onClick={handleUpdateAndDeleteOld}>
              Update and Delete Old
            </Button>
            <Button onClick={handleDeleteCertainItem}>Delete item by id</Button>
          </div>

          <div>
            {' '}
            <h2>Read Data ({allItems.length}):</h2>
            {allItems.length > 0 ? <pre>{JSON.stringify(allItems, null, 2)}</pre> : <p>No data</p>}
          </div>
        </div>

        {/* <div className="">
          <div className="flex gap-5">
            <Button type="button" onClick={handleCreate}>
              Create
            </Button>

            <Button type="button" onClick={handleRead}>
              Read
            </Button>

            <Button type="button" onClick={handleUpdate}>
              Update
            </Button>
            <Button type="button" onClick={handleDelete}>
              Delete
            </Button>
          </div>
          <div>
            <h2>Read Data:</h2>
            {itemData ? <pre>{JSON.stringify(itemData, null, 2)}</pre> : <p>No data</p>}
          </div>
        </div> */}
      </div>

      {/* <input
        id="multi-upload-area"
        name="multi-upload-area"
        accept="image/*,application/pdf"
        type="file"
        multiple
        className=""
        onChange={(event) => {
          const { files } = event.target;
          if (files && files.length > 0) {
            Array.from(files).forEach((file) => {
              const fileSize = transformBytesToFileSizeString(file.size);
            });
          }
        }}
      /> */}
    </div>
  );
};

export default Trial;
