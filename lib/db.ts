export interface GuarantorRecord {
  id?: number
  "Client ID": string
  Name: string
  "CO Name": string
  Branch: string
  [key: string]: any
}

const DB_NAME = "GuarantorDB"
const STORE_NAME = "records"
const DB_VERSION = 3 // Increment version for schema update

export class GuarantorDB {
  private static instance: GuarantorDB
  private db: IDBDatabase | null = null

  private constructor() {}

  static getInstance(): GuarantorDB {
    if (!GuarantorDB.instance) {
      GuarantorDB.instance = new GuarantorDB()
    }
    return GuarantorDB.instance
  }

  async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result

        // Delete existing store if it exists to recreate with proper schema
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME)
        }

        // Create records store
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        })

        store.createIndex("clientId", "clientId", { unique: false })
        store.createIndex("name", "name", { unique: false })
        store.createIndex("coName", "coName", { unique: false })
        store.createIndex("branch", "branch", { unique: false })
      }

      request.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result
        resolve(this.db)
      }

      request.onerror = (e) => reject(e)
    })
  }

  private normalizeRecord(record: GuarantorRecord): any {
    return {
      ...record,
      clientId: record["Client ID"],
      name: record["Name"],
      coName: record["CO Name"],
      branch: record["Branch"],
    }
  }

  async clearAndSave(data: GuarantorRecord[], onProgress?: (progress: number) => void): Promise<void> {
    console.log("[v0] Starting clearAndSave with", data.length, "records")
    const db = await this.openDB()

    // First clear existing data
    console.log("[v0] Clearing existing data...")
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)

      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        console.log("[v0] Data cleared successfully")
        resolve()
      }
      clearRequest.onerror = (e) => {
        console.log("[v0] Error clearing data:", e)
        reject(e)
      }
    })

    const batchSize = 25 // Even smaller batches for better reliability
    const totalRecords = data.length
    let processedRecords = 0

    console.log("[v0] Starting to save", totalRecords, "records in batches of", batchSize)

    for (let i = 0; i < totalRecords; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      const normalizedBatch = batch.map((record) => this.normalizeRecord(record))

      console.log(
        "[v0] Processing batch",
        Math.floor(i / batchSize) + 1,
        "of",
        Math.ceil(totalRecords / batchSize),
        "with",
        normalizedBatch.length,
        "records",
      )

      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite")
          const store = tx.objectStore(STORE_NAME)

          let completed = 0
          let hasError = false
          const batchLength = normalizedBatch.length

          // Handle transaction errors
          tx.onerror = (e) => {
            console.log("[v0] Transaction error in batch:", e)
            if (!hasError) {
              hasError = true
              reject(e)
            }
          }

          tx.onabort = (e) => {
            console.log("[v0] Transaction aborted in batch:", e)
            if (!hasError) {
              hasError = true
              reject(new Error("Transaction aborted"))
            }
          }

          // Add all records in the batch
          normalizedBatch.forEach((item, index) => {
            if (hasError) return

            const request = store.add(item)

            request.onsuccess = () => {
              completed++
              console.log("[v0] Record", index + 1, "of", batchLength, "saved in current batch")

              if (completed === batchLength) {
                processedRecords += batchLength
                const progress = Math.round((processedRecords / totalRecords) * 100)
                console.log(
                  "[v0] Batch completed. Progress:",
                  progress + "%",
                  "(" + processedRecords + "/" + totalRecords + ")",
                )
                onProgress?.(progress)
                resolve()
              }
            }

            request.onerror = (e) => {
              console.log("[v0] Error saving record", index + 1, "in batch:", e)
              if (!hasError) {
                hasError = true
                reject(e)
              }
            }
          })
        })

        // Small delay between batches to prevent overwhelming the browser
        if (i + batchSize < totalRecords) {
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      } catch (error) {
        console.log("[v0] Error in batch processing:", error)
        throw error
      }
    }

    console.log("[v0] All batches completed successfully. Total records saved:", processedRecords)
  }

  async getAllRecords(): Promise<GuarantorRecord[]> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()

      req.onsuccess = () => resolve(req.result)
      req.onerror = (e) => reject(e)
    })
  }

  async searchRecords(query: string): Promise<GuarantorRecord[]> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const results: GuarantorRecord[] = []

      const request = store.openCursor()
      const lowerQuery = query.toLowerCase()

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result
        if (cursor) {
          const record = cursor.value

          const searchableFields = ["Client ID", "Name", "CO Name", "Branch", "clientId", "name", "coName", "branch"]
          const matches = searchableFields.some((field) => {
            const value = record[field]
            return value && value.toString().toLowerCase().includes(lowerQuery)
          })

          if (matches) {
            results.push(record)
          }

          cursor.continue()
        } else {
          resolve(results)
        }
      }

      request.onerror = (e) => reject(e)
    })
  }

  async getRecordCount(): Promise<number> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const req = store.count()

      req.onsuccess = () => resolve(req.result)
      req.onerror = (e) => reject(e)
    })
  }

  async deleteAllRecords(): Promise<void> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const req = store.clear()

      req.onsuccess = () => resolve()
      req.onerror = (e) => reject(e)
    })
  }
}

// Export singleton instance
export const guarantorDB = GuarantorDB.getInstance()
