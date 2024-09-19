import React from 'react';

const FloatingUploadPopup = () => {
  return (
    <div className="fixed bottom-4 right-4 w-80 rounded-lg bg-white p-4 shadow-lg">
      <h3 className="text-lg font-semibold">Upload file</h3>
      <div className="mt-2 space-y-2">
        {[...Array(3)].map((_, index) => (
          <div
            key={`uploading-${index + 1}`}
            className="flex items-center justify-between rounded-md bg-gray-50 p-2"
          >
            <div>
              <p className="text-sm">preline-ui.xls</p>
              <div className="mt-1 h-2 w-full rounded bg-gray-200">
                <div
                  className="h-full rounded bg-blue-500"
                  style={{ width: `${index * 20}%` }}
                ></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button type="button" className="p-1 text-gray-500 hover:text-blue-500">
                暫停
              </button>
              <button type="button" className="p-1 text-gray-500 hover:text-red-500">
                刪除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FloatingUploadPopup;
