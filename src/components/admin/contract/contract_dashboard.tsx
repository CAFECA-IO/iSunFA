'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { TASK_BOARD_ABI, ERC3643_TOKEN_ABI } from '@/lib/task_board_abi';

export default function ContractDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tokenInfo, setTokenInfo] = useState<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  } | null>(null);

  const [boardInfo, setBoardInfo] = useState<{
    address: string;
    baseFee: string;
    defaultTimeout: number;
    symbol: string;
  } | null>(null);

  const [tasks, setTasks] = useState<{
    id: string;
    publisher: string;
    rewardAmount: string;
    deadline: number;
    status: number;
  }[]>([]);



  useEffect(() => {
    const fetchContractData = async () => {
      try {
        setLoading(true);
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
        const taskBoardAddress = process.env.NEXT_PUBLIC_TASK_BOARD_ADDRESS;

        if (!rpcUrl || !taskBoardAddress) {
          throw new Error('RPC URL or Task Board Address is not configured.');
        }

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const taskBoard = new ethers.Contract(taskBoardAddress, TASK_BOARD_ABI, provider);

        // Info: (20260316 - Luphia) Fetch Token Info
        let tokenAddress;
        try {
          tokenAddress = await taskBoard.token();
        } catch (e) {
          console.error("Failed to fetch token address", e);
          tokenAddress = process.env.NEXT_PUBLIC_NTD_TOKEN_ADDRESS; // Info: (20260316 - Luphia) fallback if needed
        }

        let decimalsToUse = 2; // Info: (20260316 - Luphia) fallback
        if (tokenAddress && tokenAddress !== ethers.ZeroAddress) {
          const tokenContract = new ethers.Contract(tokenAddress, ERC3643_TOKEN_ABI, provider);

          let name = 'ISC Token';
          let symbol = 'ISC';
          let decimals = 2;
          let totalSupplyStr = '0';

          try {
            name = await tokenContract.name();
            symbol = await tokenContract.symbol();
            decimals = await tokenContract.decimals();
            decimalsToUse = Number(decimals);
            const supply = await tokenContract.totalSupply();
            totalSupplyStr = ethers.formatUnits(supply, decimals);
          } catch (e) {
            console.error("Failed to fetch token details, using defaults", e);
          }

          setTokenInfo({
            address: tokenAddress,
            name,
            symbol,
            decimals: Number(decimals),
            totalSupply: totalSupplyStr,
          });
        }

        // Info: (20260317 - Luphia) Fetch Board Constants
        let baseFeeStr = '1';
        let defaultTimeout = 300;
        try {
          const fetchedBaseFee = await taskBoard.BASE_FEE();
          baseFeeStr = ethers.formatUnits(fetchedBaseFee, decimalsToUse);
          defaultTimeout = Number(await taskBoard.DEFAULT_TIMEOUT());
        } catch (e) {
          console.error("Failed to fetch TaskBoard constants", e);
        }

        setBoardInfo({
          address: taskBoardAddress,
          baseFee: baseFeeStr,
          defaultTimeout: defaultTimeout,
          symbol: tokenInfo?.symbol || 'ISC'
        });

        // Info: (20260316 - Luphia) Fetch Tasks
        const allTaskIds = await taskBoard.listTask();
        const fetchedTasks = [];

        for (const taskId of allTaskIds) {
          const taskDetails = await taskBoard.tasks(taskId);
          fetchedTasks.push({
            id: taskId,
            publisher: taskDetails.publisher,
            rewardAmount: ethers.formatUnits(taskDetails.rewardAmount, decimalsToUse),
            deadline: Number(taskDetails.deadline),
            status: Number(taskDetails.status)
          });
        }

        setTasks(fetchedTasks);
      } catch (err) {
        console.error('Error fetching contract data:', err);
        setError((err as Error).message || 'Failed to load contract data');
      } finally {
        setLoading(false);
      }
    };

    fetchContractData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">
        <h3 className="font-bold">Error Loading Data</h3>
        <p>{error}</p>
      </div>
    );
  }

  const getStatusString = (status: number) => {
    switch (status) {
      case 0: return 'Open';
      case 1: return 'Evaluating';
      case 2: return 'Settled';
      case 3: return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 1: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 2: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 3: return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info: (20260316 - Luphia) Token Info Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ERC-3643 Token Status
          </h2>

          {tokenInfo ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                <span className="text-gray-400">Name</span>
                <span className="text-white font-medium">{tokenInfo.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                <span className="text-gray-400">Symbol</span>
                <span className="text-white font-medium">{tokenInfo.symbol}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                <span className="text-gray-400">Total Supply</span>
                <span className="text-white font-medium">{tokenInfo.totalSupply} {tokenInfo.symbol}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                <span className="text-gray-400">Decimals</span>
                <span className="text-white font-medium">{tokenInfo.decimals}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">Contract</span>
                <a
                  href={`${process.env.NEXT_PUBLIC_BAIFA_EXPLORER}/address/${tokenInfo.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-400 hover:text-green-300 font-mono text-sm truncate max-w-[150px]"
                >
                  {tokenInfo.address.substring(0, 6)}...{tokenInfo.address.substring(38)}
                </a>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Token information not available.</p>
          )}
        </div>

        {/* Info: (20260316 - Luphia) Task Board Info Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            Task Board
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
              <span className="text-gray-400">Contract Address</span>
              <a
                href={`${process.env.NEXT_PUBLIC_BAIFA_EXPLORER}/address/${process.env.NEXT_PUBLIC_TASK_BOARD_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 font-mono text-sm"
              >
                {process.env.NEXT_PUBLIC_TASK_BOARD_ADDRESS?.substring(0, 6)}...{process.env.NEXT_PUBLIC_TASK_BOARD_ADDRESS?.substring(38)}
              </a>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
              <span className="text-gray-400">Total Tasks</span>
              <span className="text-white font-medium">{tasks.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
              <span className="text-gray-400">Active Tasks</span>
              <span className="text-white font-medium">{tasks.filter(t => t.status === 0).length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
              <span className="text-gray-400">Settled Tasks</span>
              <span className="text-white font-medium">{tasks.filter(t => t.status === 2).length}</span>
            </div>
            {boardInfo && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                  <span className="text-gray-400">Base Fee</span>
                  <span className="text-white font-medium">{boardInfo.baseFee} {boardInfo.symbol}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Default Timeout</span>
                  <span className="text-white font-medium">{boardInfo.defaultTimeout} seconds</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg mt-6">
        <h2 className="text-xl font-bold text-white mb-4">Task List</h2>

        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-900/50 rounded-lg border border-gray-800">
            No tasks found on the board.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">Task ID</th>
                  <th scope="col" className="px-6 py-3">Publisher</th>
                  <th scope="col" className="px-6 py-3">Reward</th>
                  <th scope="col" className="px-6 py-3">Deadline</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const isExpired = (Date.now() / 1000) > task.deadline;
                  const isOpen = task.status === 0;

                  return (
                    <tr key={task.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-white truncate max-w-[150px]" title={task.id}>
                        {task.id}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-300">
                        {task.publisher.substring(0, 6)}...{task.publisher.substring(38)}
                      </td>
                      <td className="px-6 py-4 text-white">
                        {task.rewardAmount} <span className="text-xs text-gray-500">{tokenInfo?.symbol}</span>
                      </td>
                      <td className="px-6 py-4">
                        {new Date(task.deadline * 1000).toLocaleString()}
                        {isExpired && isOpen && <span className="block text-xs text-red-400 mt-1">Expired</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                          {getStatusString(task.status)}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
