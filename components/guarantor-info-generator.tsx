"use client"

import type React from "react"

import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react"

// Dynamically load XLSX from CDN
const useXLSX = () => {
  const [XLSX, setXLSX] = useState<any>(null)

  useEffect(() => {
    const loadXLSX = async () => {
      if (typeof window !== "undefined") {
        // @ts-ignore
        if (window.XLSX) {
          // @ts-ignore
          setXLSX(window.XLSX)
        } else {
          const script = document.createElement("script")
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
          script.async = true
          script.onload = () => {
            // @ts-ignore
            setXLSX(window.XLSX)
          }
          document.head.appendChild(script)
        }
      }
    }

    loadXLSX()
  }, [])

  return XLSX
}

const COL_MAP = {
  // Report 24: Guarantor Info
  G_CNIC: 3, // D
  G_ADDRESS: 6, // G
  G_LOAN_AMOUNT: 8, // I
  G_LOAN_CYCLE: 10, // K
  G_NAME: 14, // O
  G_CELL: 16, // Q

  // Report 12: Active Clients
  A_CLIENT_ID: 1, // B
  A_NAME: 2, // C
  A_SPOUSE: 3, // D
  A_PRODUCT: 5, // F
  A_CO_NAME: 6, // G
  A_CELL_NO: 9, // J
  A_AREA: 15, // P
  A_MATURITY_DATE: 16, // Q
  A_BRANCH: 18, // S
  A_LAST_PAID: 20, // U
  A_CNIC: 13, // N (Used for matching)
}

function normalizeCNIC(value: any): string {
  if (value == null) return ""
  return String(value)
    .replace(/[^0-9]/g, "")
    .trim()
}

const excelEpoch = new Date(1899, 11, 30)

function formatDDMMMYYYY(excelDateSerial: any): string {
  if (typeof excelDateSerial !== "number" || excelDateSerial < 1) return String(excelDateSerial || "")

  let days = excelDateSerial - 1
  if (excelDateSerial > 60) days -= 1

  const ms = days * 24 * 60 * 60 * 1000
  const d = new Date(excelEpoch.getTime() + ms)

  if (isNaN(d.getTime())) return String(excelDateSerial)

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const dd = String(d.getDate()).padStart(2, "0")
  const m = months[d.getMonth()]
  const yyyy = d.getFullYear()
  return `${dd}-${m}-${yyyy}`
}

function humanSize(bytes: number): string {
  if (!bytes) return ""
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

export default function GuarantorInfoGenerator() {
  const XLSX = useXLSX()
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [file1Info, setFile1Info] = useState({
    name: "No file chosen",
    size: "",
  })
  const [file2Info, setFile2Info] = useState({
    name: "No file chosen",
    size: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("Starting...")
  const [reducedMotion, setReducedMotion] = useState(false)
  const file1Ref = useRef<HTMLInputElement>(null)
  const file2Ref = useRef<HTMLInputElement>(null)
  const dropzone1Ref = useRef<HTMLDivElement>(null)
  const dropzone2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem("cnic-merger-reduced-motion")
    setReducedMotion(saved === "1")
  }, [])

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    fileSetter: React.Dispatch<React.SetStateAction<File | null>>,
    infoSetter: React.Dispatch<React.SetStateAction<{ name: string; size: string }>>,
    defaultInfoText: string,
  ) => {
    const file = e.target.files?.[0] || null
    fileSetter(file)
    infoSetter({
      name: file ? file.name : "No file chosen",
      size: file ? `${humanSize(file.size)} | ${defaultInfoText}` : defaultInfoText,
    })
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.add("dragover")
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.classList.remove("dragover")
  }

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
    fileSetter: React.Dispatch<React.SetStateAction<File | null>>,
    infoSetter: React.Dispatch<React.SetStateAction<{ name: string; size: string }>>,
    defaultInfoText: string,
  ) => {
    e.preventDefault()
    e.currentTarget.classList.remove("dragover")
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      fileSetter(file)
      infoSetter({
        name: file.name,
        size: `${humanSize(file.size)} | ${defaultInfoText}`,
      })
    } else if (file) {
      alert("Invalid file type. Please upload an .xlsx or .xls file.")
    }
  }

  const handleClick = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click()
  }

  const updateProgress = (percent: number, text: string) => {
    setProgress(percent)
    setProgressText(text)
  }

  const processFiles = async () => {
    if (!XLSX) {
      alert("XLSX library not loaded. Please try again.")
      return
    }

    if (!file1 || !file2) {
      setIsError(true)
      setTimeout(() => setIsError(false), 3000)
      return
    }

    setIsProcessing(true)
    setIsSuccess(false)
    setIsError(false)
    updateProgress(2, "Loading files...")

    try {
      const p1 = new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject("Failed to read Guarantor Info file.")
        reader.readAsBinaryString(file1)
      })

      const p2 = new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject("Failed to read Active Client file.")
        reader.readAsBinaryString(file2)
      })

      const [res1, res2] = await Promise.all([p1, p2])

      updateProgress(8, "Parsing workbooks...")
      let data1: any[][], data2: any[][]
      try {
        const wb1 = XLSX.read(res1, { type: "binary" })
        data1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], {
          header: 1,
          raw: true,
        })

        const wb2 = XLSX.read(res2, { type: "binary" })
        data2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], {
          header: 1,
          raw: true,
        })
      } catch (err) {
        throw new Error("Failed to parse Excel files. Ensure they are valid .xlsx or .xls files and not corrupt.")
      }

      const filtered: Record<string, { index: number; cycle: number; rowData: any[] }> = {}
      const totalSteps = Math.max(1, data1.length + data2.length - 4)
      let stepsDone = 0
      const guarantorInfoStartRow = 2

      for (let i = guarantorInfoStartRow; i < data1.length; i++) {
        const row = data1[i]
        const cnic = normalizeCNIC(row[COL_MAP.G_CNIC])
        const cycle = Number.parseInt(row[COL_MAP.G_LOAN_CYCLE]) || 0

        if (cnic.length >= 13 && row[COL_MAP.G_NAME]) {
          if (!filtered[cnic] || cycle > filtered[cnic].cycle) {
            filtered[cnic] = { index: i, cycle, rowData: row }
          }
        }
        stepsDone++
        if (stepsDone % 500 === 0) {
          const pct = Math.round((stepsDone / totalSteps) * 50)
          updateProgress(pct, `Scanning Guarantor Loans... (${i}/${data1.length - 1})`)
          await new Promise((r) => setTimeout(r, 0))
        }
      }

      const output = [
        [
          "Client ID",
          "Name",
          "Spouse",
          "Product",
          "CO Name",
          "Cell No",
          "Area",
          "Maturity Date",
          "Branch",
          "Last Amount Paid",
          "Address",
          "Loan Amount",
          "Loan Cycle",
          "Guarantor Name",
          "Guarantor Cell",
        ],
      ]
      const activeClientStartRow = 2

      for (let i = activeClientStartRow; i < data2.length; i++) {
        const row2 = data2[i]
        const cnic2 = normalizeCNIC(row2[COL_MAP.A_CNIC])
        const match = filtered[cnic2]

        if (match) {
          const row1 = match.rowData

          const rawMat = row2[COL_MAP.A_MATURITY_DATE]
          const matFormatted = formatDDMMMYYYY(rawMat)

          output.push([
            row2[COL_MAP.A_CLIENT_ID],
            row2[COL_MAP.A_NAME],
            row2[COL_MAP.A_SPOUSE],
            row2[COL_MAP.A_PRODUCT],
            row2[COL_MAP.A_CO_NAME],
            row2[COL_MAP.A_CELL_NO],
            row2[COL_MAP.A_AREA],
            matFormatted,
            row2[COL_MAP.A_BRANCH],
            row2[COL_MAP.A_LAST_PAID],
            row1[COL_MAP.G_ADDRESS],
            row1[COL_MAP.G_LOAN_AMOUNT],
            row1[COL_MAP.G_LOAN_CYCLE],
            row1[COL_MAP.G_NAME],
            row1[COL_MAP.G_CELL],
          ])
        }
        stepsDone++
        if (stepsDone % 500 === 0) {
          const pct = Math.round((stepsDone / totalSteps) * 95)
          updateProgress(pct, `Matching Active Clients... (${i}/${data2.length - 1})`)
          await new Promise((r) => setTimeout(r, 0))
        }
      }

      updateProgress(96, `Writing workbook with ${output.length - 1} matched records...`)

      const ws = XLSX.utils.aoa_to_sheet(output)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "GuarantorInfoData")
      XLSX.writeFile(wb, "Updated Guarantor Info.xlsx")

      updateProgress(100, "Export complete")
      setIsSuccess(true)
      setTimeout(() => {
        setIsProcessing(false)
        setIsSuccess(false)
      }, 3000)
    } catch (err) {
      updateProgress(100, "Export failed")
      console.error("Export Error:", err)
      setIsError(true)
      setIsProcessing(false)
      setTimeout(() => setIsError(false), 3000)
    }
  }

  const toggleReducedMotion = () => {
    const newValue = !reducedMotion
    setReducedMotion(newValue)
    localStorage.setItem("cnic-merger-reduced-motion", newValue ? "1" : "0")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-4 md:p-8 relative overflow-hidden">
      {/* Animated background */}
      <div
        className={`fixed inset-0 z-[-2] bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 bg-[length:300%_300%] ${
          !reducedMotion ? "animate-gradientShift" : ""
        } filter blur-[30px] contrast-[1.05] saturate-[1.05] opacity-95`}
      />

      {/* Gradient animation keyframes */}
      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradientShift {
          animation: gradientShift 18s ease infinite;
        }
      `}</style>

      <div className="container mx-auto min-h-screen flex items-center justify-center py-10">
        <div
          className={`w-full max-w-4xl p-8 rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 backdrop-blur-lg shadow-2xl relative overflow-hidden transform transition-all duration-400 ${
            !reducedMotion ? "hover:-translate-y-2 hover:scale-[1.01]" : ""
          }`}
        >
          {/* Decorative elements */}
          <div className="absolute -right-20 -top-10 w-[420px] h-[420px] bg-gradient-to-br from-cyan-400/10 to-purple-400/10 rotate-[22deg] blur-[36px] pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col items-start mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <span>Guarantor Info Sheet Generator</span>
              <span className="text-2xl">💾</span>
            </h1>
            <p className="text-blue-200 mt-2">
              Match <strong>Active Client</strong> data (Report 12) with <strong>Guarantor Info</strong> (Report 24)
              based on CNIC and export a consolidated list.
            </p>
          </div>

          {/* File inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* File 1 - Guarantor Info */}
            <div className="flex flex-col">
              <label htmlFor="sheet1" className="font-semibold text-white mb-2">
                1. Guarantor Info (Report 24)
              </label>
              <div
                ref={dropzone1Ref}
                className={`p-4 rounded-xl border-2 border-dashed border-white/20 bg-gradient-to-b from-white/5 to-white/2 flex items-center gap-4 transition-all ${
                  file1 ? "border-cyan-400/50" : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, setFile1, setFile1Info, "CNIC expected in column D (index 3).")}
                onClick={() => handleClick(file1Ref)}
                tabIndex={0}
                role="button"
                aria-label="Drop Guarantor Info sheet here"
              >
                <span className="text-2xl text-cyan-400">
                  <i className="fas fa-file-excel"></i>
                </span>
                <input
                  type="file"
                  id="sheet1"
                  ref={file1Ref}
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, setFile1, setFile1Info, "CNIC expected in column D (index 3).")}
                />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <div className="text-white font-medium truncate w-full">{file1Info.name}</div>
                  <div className="text-blue-200 text-sm">
                    {file1Info.size || "CNIC is expected in column D (index 3)."}
                  </div>
                </div>
              </div>
              <p className="text-blue-200 text-sm mt-2">
                Contains guarantor and loan cycle information. Latest loan cycle will be prioritized per CNIC.
              </p>
            </div>

            {/* File 2 - Active Client List */}
            <div className="flex flex-col">
              <label htmlFor="sheet2" className="font-semibold text-white mb-2">
                2. Active Client List (Report 12)
              </label>
              <div
                ref={dropzone2Ref}
                className={`p-4 rounded-xl border-2 border-dashed border-white/20 bg-gradient-to-b from-white/5 to-white/2 flex items-center gap-4 transition-all ${
                  file2 ? "border-cyan-400/50" : ""
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, setFile2, setFile2Info, "Client CNIC expected in column N (index 13).")}
                onClick={() => handleClick(file2Ref)}
                tabIndex={0}
                role="button"
                aria-label="Drop Active Client List sheet here"
              >
                <span className="text-2xl text-cyan-400">
                  <i className="fas fa-file-excel"></i>
                </span>
                <input
                  type="file"
                  id="sheet2"
                  ref={file2Ref}
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) =>
                    handleFileChange(e, setFile2, setFile2Info, "Client CNIC expected in column N (index 13).")
                  }
                />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <div className="text-white font-medium truncate w-full">{file2Info.name}</div>
                  <div className="text-blue-200 text-sm">
                    {file2Info.size || "Client CNIC is expected in column N (index 13)."}
                  </div>
                </div>
              </div>
              <p className="text-blue-200 text-sm mt-2">
                Contains client details, maturity date, and loan amount. Only clients in this list will be outputted.
              </p>
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              id="merge-btn"
              onClick={processFiles}
              disabled={isProcessing || !file1 || !file2 || !XLSX}
              className={`w-full sm:w-auto h-14 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                isProcessing
                  ? "bg-purple-600 text-white"
                  : isSuccess
                    ? "bg-green-500 text-green-900"
                    : isError
                      ? "bg-red-500 text-red-900"
                      : file1 && file2 && XLSX
                        ? "bg-gradient-to-r from-cyan-400 to-purple-500 text-blue-900 hover:from-cyan-300 hover:to-purple-400 hover:shadow-lg hover:-translate-y-1"
                        : "bg-gray-600 text-gray-300 cursor-not-allowed"
              }`}
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-cogs animate-spin"></i>
                  <span>Processing...</span>
                </>
              ) : isSuccess ? (
                <>
                  <i className="fas fa-check-circle"></i>
                  <span>Export Complete!</span>
                </>
              ) : isError ? (
                <>
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>Export Failed</span>
                </>
              ) : !XLSX ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  <span>Loading Library...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-file-download"></i>
                  <span>Generate Guarantor Excel Sheet</span>
                </>
              )}
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <p className="text-blue-200 text-sm">
                Supports .xlsx and .xls. Processing is done locally in your browser.
              </p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={reducedMotion} onChange={toggleReducedMotion} className="w-4 h-4" />
                  <span className="text-blue-200 text-sm">Reduce motion</span>
                </label>
                <div className="text-blue-200 text-sm">Designed By AAO</div>
              </div>
            </div>
          </div>

          {/* Column mapping reference */}
          <div className="border-t border-white/10 pt-6 mt-8">
            <h2 className="text-xl font-semibold text-cyan-400 mb-4">Column Mapping Reference (Output Columns)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex">
                <div className="font-semibold text-white w-32">Client Data:</div>
                <div className="text-blue-200">
                  ID (B), Name (C), Spouse (D), Product (F), CO Name (G), Cell (J), Area (P), Maturity Date (Q), Branch
                  (S), Last Paid (U) <strong>(From Report 12)</strong>
                </div>
              </div>
              <div className="flex">
                <div className="font-semibold text-white w-32">Guarantor Data:</div>
                <div className="text-blue-200">
                  Address (G), Loan Amount (I), Loan Cycle (K), Guarantor Name (O), Guarantor Cell (Q){" "}
                  <strong>(From Report 24)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress overlay */}
      {(isProcessing || isSuccess || isError) && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="w-full max-w-md p-6 rounded-xl bg-gradient-to-b from-blue-900/30 to-purple-900/30 border border-white/10 backdrop-blur-lg">
            <div className="font-bold text-white mb-3">
              {isProcessing
                ? progress < 10
                  ? "Reading files"
                  : progress < 60
                    ? "Processing data"
                    : progress < 95
                      ? "Matching & Compiling"
                      : "Finalizing export"
                : isSuccess
                  ? "Export complete"
                  : "Export failed"}
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-blue-200 text-sm mt-3">{progressText}</div>
          </div>
        </div>
      )}
    </div>
  )
}
