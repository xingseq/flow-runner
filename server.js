/**
 * Flow Runner 后端服务器
 * 通过调用 najie-flow CLI 提供 API
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 获取数据目录：优先使用命令行参数，其次使用环境变量
function getDataDir() {
  // 从命令行参数获取 --data-dir
  const args = process.argv.slice(2)
  const dataDirIndex = args.indexOf('--data-dir')
  if (dataDirIndex !== -1 && args[dataDirIndex + 1]) {
    return args[dataDirIndex + 1]
  }
  
  // 从环境变量获取
  if (process.env.NAJIE_USER_DATA_PATH) {
    return process.env.NAJIE_USER_DATA_PATH
  }
  
  return null
}

const DATA_DIR = getDataDir()
if (DATA_DIR) {
  console.log(`[数据目录] ${DATA_DIR}`)
} else {
  console.log('[数据目录] 未指定，使用默认配置')
}

const app = express()
const PORT = 5176

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'ui', 'dist')))

// najie-flow CLI 路径
function getCLIPath() {
  // 尝试在系统中查找 najie-flow CLI
  // 如果已全局安装，可以使用 'najie-flow'
  // 如果是本地开发，需要指定正确的路径
  const cliPath = process.env.NAJIE_FLOW_CLI || 'najie-flow'
  return cliPath
}

function runCLI(args, options = {}) {
  return new Promise((resolve, reject) => {
    const cliPath = getCLIPath()
    
    // 添加数据目录参数
    const finalArgs = [...args]
    if (DATA_DIR) {
      finalArgs.push('--data-dir', DATA_DIR)
    }
    
    // 如果 CLI 路径是 .js 文件，使用 node 执行
    let command, commandArgs
    if (cliPath.endsWith('.js')) {
      command = process.execPath
      commandArgs = [cliPath, ...finalArgs]
      console.log(`[CLI] node ${cliPath} ${finalArgs.join(' ')}`)
    } else {
      command = cliPath
      commandArgs = finalArgs
      console.log(`[CLI] ${cliPath} ${finalArgs.join(' ')}`)
    }
    
    // 准备环境变量
    const envVars = { ...process.env, FORCE_COLOR: '0' }
    if (DATA_DIR) {
      envVars.NAJIE_USER_DATA_PATH = DATA_DIR
    }
    
    const child = spawn(command, commandArgs, {
      cwd: options.cwd || __dirname,
      env: envVars,
      shell: false
    })
    
    let stdout = '', stderr = ''
    child.stdout.on('data', d => stdout += d.toString())
    child.stderr.on('data', d => stderr += d.toString())
    
    child.on('close', code => {
      resolve(code === 0 
        ? { success: true, output: stdout, stderr }
        : { success: false, error: stderr || stdout, code })
    })
    child.on('error', reject)
    
    setTimeout(() => { child.kill(); reject(new Error('超时')) }, options.timeout || 60000)
  })
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.post('/api/flows/:id/run', async (req, res) => {
  try {
    const { input, maxIterations } = req.body
    const args = ['run', req.params.id]
    if (input) args.push('-i', input)
    if (maxIterations) args.push('-m', String(maxIterations))
    
    const result = await runCLI(args, { timeout: 120000 })
    res.json({ success: result.success, output: result.output, error: result.error })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

app.use((req, res) => res.sendFile(path.join(__dirname, 'ui', 'dist', 'index.html')))

app.listen(PORT, () => console.log(`Flow Runner 服务已启动: http://localhost:${PORT}`))
