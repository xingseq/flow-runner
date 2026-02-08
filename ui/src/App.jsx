import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:5176/api'

function App() {
  const [flows, setFlows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFlow, setSelectedFlow] = useState(null)
  const [flowDetail, setFlowDetail] = useState(null)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)

  // 检查后端连接
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(() => setConnected(true))
      .catch(() => setConnected(false))
  }, [])

  // 加载流程图列表
  useEffect(() => {
    if (!connected) return
    setLoading(true)
    fetch(`${API_BASE}/flows`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setFlows(data.data || [])
        else setError(data.error)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [connected])

  // 加载流程图详情
  const loadDetail = async (id) => {
    setSelectedFlow(id)
    setFlowDetail(null)
    setRunResult(null)
    try {
      const r = await fetch(`${API_BASE}/flows/${id}`)
      const data = await r.json()
      if (data.success) setFlowDetail(data.data)
    } catch (e) { console.error(e) }
  }

  // 执行流程图
  const runFlow = async () => {
    if (!selectedFlow) return
    setRunning(true)
    setRunResult(null)
    try {
      const r = await fetch(`${API_BASE}/flows/${selectedFlow}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input || undefined })
      })
      const data = await r.json()
      setRunResult(data)
    } catch (e) {
      setRunResult({ success: false, error: e.message })
    } finally {
      setRunning(false)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">正在连接后端服务...</h1>
          <p className="text-gray-400">请确保服务已启动 (端口 5176)</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 头部 */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold"> 流程运行器</h1>
          <span className="text-sm text-green-400"> 已连接</span>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* 左侧：流程图列表 */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-400">流程图列表</h2>
          </div>
          {loading ? (
            <div className="p-4 text-gray-500">加载中...</div>
          ) : error ? (
            <div className="p-4 text-red-400">{error}</div>
          ) : flows.length === 0 ? (
            <div className="p-4 text-gray-500">暂无流程图</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {flows.map(flow => (
                <button
                  key={flow.id}
                  onClick={() => loadDetail(flow.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition ${
                    selectedFlow === flow.id ? 'bg-gray-700 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <div className="font-medium truncate">{flow.name}</div>
                  <div className="text-xs text-gray-500 truncate">{flow.id}</div>
                  {flow.group && <div className="text-xs text-blue-400 mt-1"> {flow.group}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：详情和执行 */}
        <div className="flex-1 overflow-y-auto">
          {!selectedFlow ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4"></div>
                <p>选择一个流程图查看详情</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* 流程图信息 */}
              {flowDetail && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">{flowDetail.name}</h2>
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span> {flowDetail.nodeCount} 节点</span>
                    <span> {flowDetail.edgeCount} 连接</span>
                  </div>
                  {flowDetail.nodes?.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-400 mb-2">节点列表</h3>
                      <div className="space-y-1">
                        {flowDetail.nodes.map(node => (
                          <div key={node.id} className="text-sm">
                            <span className="text-blue-400">{node.type}</span>
                            <span className="text-gray-500"> - </span>
                            <span>{node.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 执行区域 */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-3">执行流程图</h3>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">输入数据 (可选)</label>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="输入初始数据..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    rows={3}
                  />
                </div>
                <button
                  onClick={runFlow}
                  disabled={running}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded font-medium transition"
                >
                  {running ? '执行中...' : ' 执行'}
                </button>
              </div>

              {/* 执行结果 */}
              {runResult && (
                <div className={`mt-4 p-4 rounded-lg ${runResult.success ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                  <h3 className={`font-semibold mb-2 ${runResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {runResult.success ? ' 执行成功' : ' 执行失败'}
                  </h3>
                  <pre className="text-sm whitespace-pre-wrap overflow-x-auto bg-gray-900 p-3 rounded">
                    {runResult.output || runResult.error || '无输出'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
