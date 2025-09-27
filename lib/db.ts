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
const DB_VERSION = 2 // Increment version to trigger schema update

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

  async clearAndSave(data: GuarantorRecord[]): Promise<void> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)

      // Clear existing data
      const clearRequest = store.clear()

      clearRequest.onsuccess = () => {
        const normalizedData = data.map((record) => this.normalizeRecord(record))

        // Add new data in batches for better performance
        const batchSize = 100
        let index = 0

        const addBatch = () => {
          const batch = normalizedData.slice(index, index + batchSize)
          if (batch.length === 0) {
            resolve()
            return
          }

          batch.forEach((item) => store.add(item))
          index += batchSize

          // Use setTimeout to prevent blocking the UI
          setTimeout(addBatch, 0)
        }

        addBatch()
      }

      clearRequest.onerror = (e) => reject(e)
      tx.onerror = (e) => reject(e)
    })
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
