export interface GuarantorRecord {
  id?: number
  "Client ID": string
  Name: string
  "CO Name": string
  Branch: string
  [key: string]: any
}

export interface User {
  id?: number
  username: string
  password: string
  createdAt?: string
  role: "user" | "admin"
}

const DB_NAME = "GuarantorDB"
const STORE_NAME = "records"
const USERS_STORE_NAME = "users"
const DB_VERSION = 5 // Incremented to add users store

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
        const oldVersion = e.oldVersion

        console.log("[v0] Database upgrade needed. Old version:", oldVersion, "New version:", DB_VERSION)

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.log("[v0] Creating new records store")
          // Create records store
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          })

          store.createIndex("clientId", "clientId", { unique: false })
          store.createIndex("name", "name", { unique: false })
          store.createIndex("coName", "coName", { unique: false })
          store.createIndex("branch", "branch", { unique: false })
        } else {
          console.log("[v0] Records store already exists, preserving data")
          // Store exists, just ensure indexes are present
          const transaction = e.target.transaction
          if (transaction) {
            const store = transaction.objectStore(STORE_NAME)

            // Add missing indexes if they don't exist
            if (!store.indexNames.contains("clientId")) {
              store.createIndex("clientId", "clientId", { unique: false })
            }
            if (!store.indexNames.contains("name")) {
              store.createIndex("name", "name", { unique: false })
            }
            if (!store.indexNames.contains("coName")) {
              store.createIndex("coName", "coName", { unique: false })
            }
            if (!store.indexNames.contains("branch")) {
              store.createIndex("branch", "branch", { unique: false })
            }
          }
        }

        if (!db.objectStoreNames.contains(USERS_STORE_NAME)) {
          console.log("[v0] Creating users store")
          const usersStore = db.createObjectStore(USERS_STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          })
          usersStore.createIndex("username", "username", { unique: true })

          // Create default admin user
          usersStore.add({
            username: "admin",
            password: "admin123",
            role: "admin",
            createdAt: new Date().toISOString(),
          })
          console.log("[v0] Default admin user created")
        }
      }

      request.onsuccess = async (e) => {
        this.db = (e.target as IDBOpenDBRequest).result
        console.log("[v0] Database opened successfully")

        try {
          const adminExists = await this.getUserByUsername("admin")
          if (!adminExists) {
            console.log("[v0] Admin user not found, creating default admin")
            await this.addUser({
              username: "admin",
              password: "admin123",
              role: "admin",
              createdAt: new Date().toISOString(),
            })
          } else {
            console.log("[v0] Admin user already exists")
          }
        } catch (err) {
          console.log("[v0] Error checking/creating admin user:", err)
        }

        resolve(this.db)
      }

      request.onerror = (e) => {
        console.log("[v0] Database open error:", e)
        reject(e)
      }

      request.onblocked = (e) => {
        console.log("[v0] Database open blocked:", e)
        // Handle blocked event - usually means another tab has the database open
      }
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

    try {
      // First clear existing data
      console.log("[v0] Clearing existing data...")
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite")
        const store = tx.objectStore(STORE_NAME)

        // Add transaction timeout
        const timeoutId = setTimeout(() => {
          console.log("[v0] Clear transaction timeout")
          reject(new Error("Clear transaction timeout"))
        }, 30000) // 30 second timeout

        tx.oncomplete = () => {
          clearTimeout(timeoutId)
          console.log("[v0] Clear transaction completed")
          resolve()
        }

        tx.onerror = (e) => {
          clearTimeout(timeoutId)
          console.log("[v0] Clear transaction error:", e)
          reject(e)
        }

        tx.onabort = (e) => {
          clearTimeout(timeoutId)
          console.log("[v0] Clear transaction aborted:", e)
          reject(new Error("Clear transaction aborted"))
        }

        const clearRequest = store.clear()
        clearRequest.onsuccess = () => {
          console.log("[v0] Data cleared successfully")
        }
        clearRequest.onerror = (e) => {
          clearTimeout(timeoutId)
          console.log("[v0] Error clearing data:", e)
          reject(e)
        }
      })

      const batchSize = 50 // Increase batch size for better performance
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

            const timeoutId = setTimeout(() => {
              if (!hasError) {
                hasError = true
                console.log("[v0] Batch transaction timeout")
                reject(new Error("Batch transaction timeout"))
              }
            }, 60000) // 60 second timeout per batch

            // Handle transaction completion
            tx.oncomplete = () => {
              clearTimeout(timeoutId)
              if (!hasError) {
                processedRecords += batchLength
                const progress = Math.round((processedRecords / totalRecords) * 100)
                console.log(
                  "[v0] Batch transaction completed. Progress:",
                  progress + "%",
                  "(" + processedRecords + "/" + totalRecords + ")",
                )
                onProgress?.(progress)
                resolve()
              }
            }

            // Handle transaction errors
            tx.onerror = (e) => {
              clearTimeout(timeoutId)
              console.log("[v0] Batch transaction error:", e)
              if (!hasError) {
                hasError = true
                reject(e)
              }
            }

            tx.onabort = (e) => {
              clearTimeout(timeoutId)
              console.log("[v0] Batch transaction aborted:", e)
              if (!hasError) {
                hasError = true
                reject(new Error("Batch transaction aborted"))
              }
            }

            // Add all records in the batch
            normalizedBatch.forEach((item, index) => {
              if (hasError) return

              const request = store.add(item)

              request.onsuccess = () => {
                completed++
                if (completed === batchLength) {
                  // Transaction will complete automatically
                  console.log("[v0] All", batchLength, "records added to batch")
                }
              }

              request.onerror = (e) => {
                clearTimeout(timeoutId)
                console.log("[v0] Error saving record", index + 1, "in batch:", e)
                if (!hasError) {
                  hasError = true
                  reject(e)
                }
              }
            })
          })

          if (i + batchSize < totalRecords) {
            await new Promise((resolve) => setTimeout(resolve, 10))
          }
        } catch (error) {
          console.log("[v0] Error in batch processing:", error)
          throw error
        }
      }

      console.log("[v0] All batches completed successfully. Total records saved:", processedRecords)
    } catch (error) {
      console.log("[v0] Critical error in clearAndSave:", error)
      throw error
    }
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

  async searchRecordsByUser(query: string, coName: string): Promise<GuarantorRecord[]> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const results: GuarantorRecord[] = []

      const request = store.openCursor()
      const lowerQuery = query.toLowerCase()
      const lowerCoName = coName.toLowerCase()

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result
        if (cursor) {
          const record = cursor.value

          if (record["CO Name"] && record["CO Name"].toLowerCase().trim() === lowerCoName.trim()) {
            // Then filter by search query
            const searchableFields = ["Client ID", "Name", "CO Name", "Branch", "clientId", "name", "coName", "branch"]
            const matches = searchableFields.some((field) => {
              const value = record[field]
              return value && value.toString().toLowerCase().includes(lowerQuery)
            })

            if (matches) {
              results.push(record)
            }
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

  async addUser(user: Omit<User, "id">): Promise<User> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(USERS_STORE_NAME, "readwrite")
      const store = tx.objectStore(USERS_STORE_NAME)
      const request = store.add(user)

      request.onsuccess = () => {
        console.log("[v0] User added successfully")
        resolve({ ...user, id: request.result as number })
      }

      request.onerror = (e) => {
        console.log("[v0] Error adding user:", e)
        reject(e)
      }
    })
  }

  async updateUser(id: number, user: Partial<User>): Promise<void> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(USERS_STORE_NAME, "readwrite")
      const store = tx.objectStore(USERS_STORE_NAME)

      const getRequest = store.get(id)
      getRequest.onsuccess = () => {
        const existingUser = getRequest.result
        const updatedUser = { ...existingUser, ...user }

        const updateRequest = store.put(updatedUser)
        updateRequest.onsuccess = () => {
          console.log("[v0] User updated successfully")
          resolve()
        }
        updateRequest.onerror = (e) => reject(e)
      }

      getRequest.onerror = (e) => reject(e)
    })
  }

  async deleteUser(id: number): Promise<void> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(USERS_STORE_NAME, "readwrite")
      const store = tx.objectStore(USERS_STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log("[v0] User deleted successfully")
        resolve()
      }
      request.onerror = (e) => reject(e)
    })
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(USERS_STORE_NAME, "readonly")
      const store = tx.objectStore(USERS_STORE_NAME)
      const index = store.index("username")
      const request = index.get(username)

      request.onsuccess = () => {
        console.log("[v0] User lookup result for", username + ":", request.result ? "found" : "not found")
        resolve(request.result)
      }
      request.onerror = (e) => {
        console.log("[v0] Error getting user by username:", e)
        reject(e)
      }
    })
  }

  async getAllUsers(): Promise<User[]> {
    const db = await this.openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(USERS_STORE_NAME, "readonly")
      const store = tx.objectStore(USERS_STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        console.log("[v0] Retrieved", request.result.length, "users")
        resolve(request.result)
      }
      request.onerror = (e) => reject(e)
    })
  }
}

// Export singleton instance
export const guarantorDB = GuarantorDB.getInstance()
