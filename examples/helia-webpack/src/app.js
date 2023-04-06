import React, { useState, useRef } from 'react'
import ipfsLogo from './ipfs-logo.svg'
import { getHelia } from './get-helia.js'
import { unixfs } from '@helia/unixfs'

function App () {
  const [output, setOutput] = useState([])
  const [helia, setHelia] = useState(null)
  const [file, setFile] = useState(null)

  const terminalEl = useRef(null)

  const COLORS = {
    active: '#357edd',
    success: '#0cb892',
    error: '#ea5037'
  }

  const showStatus = (text, color, id) => {
    setOutput((prev) => {
      return [...prev,
        {
          content: text,
          color,
          id
        }
      ]
    })

    terminalEl.current.scroll({ top: window.terminal.scrollHeight, behavior: 'smooth' })
  }

  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        resolve(event.target.result)
      }
      reader.onerror = (error) => {
        reject(error)
      }
      reader.readAsArrayBuffer(file)
    })
  }

  const store = async (file) => {
    let node = helia

    if (!helia) {
      showStatus('Creating Helia node...', COLORS.active)

      node = await getHelia()

      setHelia(node)
    }

    showStatus(`Connecting to ${node.libp2p.peerId}...`, COLORS.active, node.libp2p.peerId)

    const contentArrayBuffer = await readFile(file)
    const fileToAdd = {
      path: `${file.name}`,
      content: new Uint8Array(contentArrayBuffer)
    }

    const fs = unixfs(node)

    showStatus(`Adding file ${fileToAdd.path}...`, COLORS.active)
    const cid = await fs.addFile(fileToAdd, node.blockstore)

    showStatus(`Added to ${cid}`, COLORS.success, cid)
    showStatus(`Preview: https://ipfs.io/ipfs/${cid}`, COLORS.success)

    // IPNS publish
    const defaultKey = await node.key.listKeys().next()
    await node.name.publish(cid, defaultKey.value)
    showStatus(`Published to IPNS: /ipns/${defaultKey.value.id}`, COLORS.success)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (file == null) {
        throw new Error('No file selected...')
      }

      await store(file)
    } catch (err) {
      showStatus(err.message, COLORS.error)
    }
  }

  return (
    <>
      <header className='flex items-center pa3 bg-navy bb bw3 b--aqua'>
        <a href='https://ipfs.io' title='home'>
          <img alt='IPFS logo' src={ipfsLogo} style={{ height: 50 }} className='v-top' />
        </a>
      </header>

      <main className="pa4-l bg-snow mw7 mv5 center pa4">
        <h1 className="pa0 f2 ma0 mb4 aqua tc">Upload a file to Helia from the browser</h1>

        <form id="upload-file" onSubmit={handleSubmit}>
          <label htmlFor="file" className="f5 ma0 pb2 aqua fw4 db">Choose a file</label>
          <input
            className="input-reset bn black-80 bg-white pa3 w-100 mb3"
            id="file"
            name="file"
            type="file"
            required
            onChange={(e) => setFile(e.target.files[0])}
          />

          <button
            className="button-reset pv3 tc bn bg-animate bg-black-80 hover-bg-aqua white pointer w-100"
            id="upload-submit"
            type="submit"
          >
            Upload file
          </button>
        </form>

        <h3>Output</h3>

        <div className="window">
          <div className="header"></div>
          <div id="terminal" className="terminal" ref={terminalEl}>
            { output.length > 0 &&
              <div id="output">
                { output.map((log, index) =>
                  <p key={index} style={{ color: log.color }} id={log.id}>
                    {log.content}
                  </p>)
                }
              </div>
            }
          </div>
        </div>
      </main>
    </>
  )
}

export default App