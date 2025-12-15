"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  Send as Sync,
  Settings,
  LogOut,
  Loader2,
  Database,
  Trash2,
  Phone,
  MessageCircle,
  Download,
  FileSpreadsheet,
  Shield,
  User,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { guarantorDB, type GuarantorRecord } from "@/lib/db"
import GuarantorInfoGenerator from "@/components/guarantor-info-generator"

const USER_PASS_KEY = "userPassword"
const ADMIN_PASS_KEY = "adminPassword"
const LAST_SYNC_KEY = "lastSync"

type UserRole = "user" | "admin"

export default function GuarantorApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>("user")
  const [loginPassword, setLoginPassword] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [records, setRecords] = useState<GuarantorRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<GuarantorRecord[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showReports, setShowReports] = useState(false)
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loginError, setLoginError] = useState("")
  const [recordCount, setRecordCount] = useState(0)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncStatus, setSyncStatus] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    console.log("[v0] Initializing app...")

    // Initialize default passwords if they don't exist
    if (!localStorage.getItem(USER_PASS_KEY)) {
      localStorage.setItem(USER_PASS_KEY, "1122")
    }
    if (!localStorage.getItem(ADMIN_PASS_KEY)) {
      localStorage.setItem(ADMIN_PASS_KEY, "rizwan963")
    }

    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY)
    setLastSync(lastSyncTime)

    try {
      console.log("[v0] Loading offline data...")
      const offlineRecords = await guarantorDB.getAllRecords()
      const count = await guarantorDB.getRecordCount()

      console.log("[v0] Loaded records:", offlineRecords.length)
      setRecords(offlineRecords)
      setFilteredRecords([])
      setRecordCount(count)
    } catch (error) {
      console.log("[v0] Error loading offline data:", error)
      toast({
        title: "Database Error",
        description: "Failed to load offline data",
        variant: "destructive",
      })
    }
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === "-") return null
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 10 || cleaned.length === 11) {
      return cleaned.startsWith("0") ? `92${cleaned.slice(1)}` : `92${cleaned}`
    }
    return cleaned.startsWith("92") ? cleaned : `92${cleaned}`
  }

  const PhoneNumberLinks = ({ phone }: { phone: string }) => {
    const formattedPhone = formatPhoneNumber(phone)

    if (!formattedPhone) {
      return <span className="text-white font-semibold animate-text-glow">{phone || "-"}</span>
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-white font-semibold animate-text-glow">{phone}</span>
        <div className="flex gap-1">
          <a
            href={`tel:+${formattedPhone}`}
            className="p-1 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
            title="Call"
          >
            <Phone className="h-3 w-3 text-white" />
          </a>
          <a
            href={`https://wa.me/${formattedPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 bg-green-500 hover:bg-green-600 rounded-full transition-colors"
            title="WhatsApp"
          >
            <MessageCircle className="h-3 w-3 text-white" />
          </a>
        </div>
      </div>
    )
  }

  const handleLogin = () => {
    const userPassword = localStorage.getItem(USER_PASS_KEY)
    const adminPassword = localStorage.getItem(ADMIN_PASS_KEY)

    if (loginPassword === adminPassword) {
      setIsLoggedIn(true)
      setUserRole("admin")
      setLoginError("")
      toast({
        title: "Admin login successful",
        description: "Welcome to Guarantor Report Viewer - Admin Access",
      })
    } else if (loginPassword === userPassword) {
      setIsLoggedIn(true)
      setUserRole("user")
      setLoginError("")
      toast({
        title: "User login successful",
        description: "Welcome to Guarantor Report Viewer",
      })
    } else {
      setLoginError("Wrong password!")
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserRole("user")
    setLoginPassword("")
    setShowAdmin(false)
    setShowReports(false)
  }

  const updateUserPassword = () => {
    if (newUserPassword.trim()) {
      localStorage.setItem(USER_PASS_KEY, newUserPassword.trim())
      setNewUserPassword("")
      toast({
        title: "User password updated",
        description: "User password has been successfully changed",
      })
    }
  }

  const updateAdminPassword = () => {
    if (newAdminPassword.trim()) {
      localStorage.setItem(ADMIN_PASS_KEY, newAdminPassword.trim())
      setNewAdminPassword("")
      toast({
        title: "Admin password updated",
        description: "Admin password has been successfully changed",
      })
    }
  }

  const syncData = async () => {
    console.log("[v0] Starting data sync...")
    setIsLoading(true)
    setSyncProgress(0)
    setSyncStatus("Connecting to server...")

    try {
      const API_URL =
        "https://script.google.com/macros/s/AKfycbz8h-lfEIEK53trQ2R42p_UfaY9ALf0wSqIqGGL17SG7UCzrdk0Tajr39itkN0l2Amf/exec"

      console.log("[v0] Fetching from Google Script URL:", API_URL)
      setSyncStatus("Fetching data from Google Sheets...")
      setSyncProgress(10)

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })

      console.log("[v0] Response status:", response.status)
      setSyncProgress(25)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setSyncStatus("Processing received data...")
      setSyncProgress(40)

      const data = await response.json()
      console.log("[v0] Received data length:", Array.isArray(data) ? data.length : "Not an array")

      let actualData: GuarantorRecord[]
      if (!Array.isArray(data)) {
        console.log("[v0] Data is not an array, trying to extract array from response")
        if (data && data.data && Array.isArray(data.data)) {
          console.log("[v0] Found data array in response.data")
          actualData = data.data
        } else {
          throw new Error("Invalid data format received - not an array")
        }
      } else {
        actualData = data
      }

      setSyncStatus(`Saving ${actualData.length} records to database...`)
      setSyncProgress(50)

      try {
        await guarantorDB.clearAndSave(actualData, (progress) => {
          const dbProgress = 50 + progress * 0.4 // 50% to 90%
          setSyncProgress(Math.round(dbProgress))
          setSyncStatus(`Saving records... ${progress}%`)
        })

        console.log("[v0] Database save completed successfully")
      } catch (dbError) {
        console.log("[v0] Database save error:", dbError)
        throw new Error(`Database save failed: ${dbError.message || dbError}`)
      }

      setSyncStatus("Finalizing sync...")
      setSyncProgress(95)

      const count = await guarantorDB.getRecordCount()
      console.log("[v0] Final record count:", count)

      setRecords(actualData)
      if (!hasSearched) {
        setFilteredRecords([])
      }
      setRecordCount(count)

      const syncTime = new Date().toLocaleString()
      localStorage.setItem(LAST_SYNC_KEY, syncTime)
      setLastSync(syncTime)

      setSyncProgress(100)
      setSyncStatus("Sync completed successfully!")

      toast({
        title: "Data synced successfully",
        description: `Successfully stored ${actualData.length} records for offline use`,
      })

      setTimeout(() => {
        setSyncProgress(0)
        setSyncStatus("")
      }, 2000)
    } catch (fetchError) {
      console.log("[v0] Sync error:", fetchError)
      setSyncStatus("Sync failed!")
      setSyncProgress(0)

      toast({
        title: "Sync failed",
        description: `Error: ${fetchError.message || fetchError}. Using offline data.`,
        variant: "destructive",
      })

      setTimeout(() => {
        setSyncProgress(0)
        setSyncStatus("")
      }, 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    console.log("[v0] Starting search for:", searchQuery)

    if (!searchQuery.trim()) {
      console.log("[v0] Empty search, hiding all records")
      setFilteredRecords([])
      setHasSearched(false)
      return
    }

    try {
      console.log("[v0] Searching records...")
      const searchResults = await guarantorDB.searchRecords(searchQuery)
      console.log("[v0] Search results:", searchResults.length, "records found")
      setFilteredRecords(searchResults)
      setHasSearched(true)

      toast({
        title: "Search completed",
        description: `Found ${searchResults.length} matching records`,
      })
    } catch (error) {
      console.log("[v0] Search error:", error)
      toast({
        title: "Search failed",
        description: "Error searching records",
        variant: "destructive",
      })
    }
  }

  const clearSearch = async () => {
    setSearchQuery("")
    setFilteredRecords([])
    setHasSearched(false)
  }

  const clearAllData = async () => {
    try {
      await guarantorDB.deleteAllRecords()
      setRecords([])
      setFilteredRecords([])
      setRecordCount(0)
      localStorage.removeItem(LAST_SYNC_KEY)
      setLastSync(null)

      toast({
        title: "Data cleared",
        description: "All offline data has been removed",
      })
    } catch (error) {
      console.error("Clear data error:", error)
      toast({
        title: "Clear failed",
        description: "Error clearing data",
        variant: "destructive",
      })
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>

        <div className="absolute top-10 right-10 w-4 h-4 bg-cyan-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-10 left-10 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-pink-400 rounded-full animate-pulse"></div>

        <Card className="w-full max-w-md relative z-10 bg-gradient-to-br from-slate-800/90 via-purple-800/90 to-slate-800/90 border-purple-500/30 shadow-2xl animate-pulse-glow backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full flex items-center justify-center animate-shine">
              <Database className="h-8 w-8 text-slate-900" />
            </div>
            <CardTitle className="text-2xl font-bold text-white animate-text-glow">Guarantor Report Viewer</CardTitle>
            <CardDescription className="text-purple-200">Enter your password to access the app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              className="bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200 focus:border-cyan-400 focus:ring-cyan-400/20"
            />
            {loginError && (
              <p className="text-sm text-red-400 animate-pulse bg-red-900/20 p-2 rounded border border-red-500/30">
                {loginError}
              </p>
            )}
            <Button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 animate-shine"
            >
              Login
            </Button>
            <div className="text-center text-xs text-purple-300 space-y-1">
              <p>User Access: user123</p>
              <p>Admin Access: admin123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>

      <header className="relative z-10 bg-gradient-to-r from-slate-800/90 via-purple-800/90 to-slate-800/90 border-b border-purple-500/30 p-4 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white animate-text-glow">Guarantor Reports</h1>
              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full border border-cyan-400/30">
                {userRole === "admin" ? (
                  <Shield className="h-3 w-3 text-cyan-400" />
                ) : (
                  <User className="h-3 w-3 text-blue-400" />
                )}
                <span className="text-xs text-white font-medium capitalize">{userRole}</span>
              </div>
            </div>
            <p className="text-sm text-purple-200 flex items-center gap-1 mt-1">
              <Database className="h-3 w-3" />
              {recordCount} records stored offline
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userRole === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReports(!showReports)}
                className="bg-slate-700/50 border-purple-400/30 text-purple-200 hover:bg-purple-700/50 hover:text-white"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdmin(!showAdmin)}
              className="bg-slate-700/50 border-purple-400/30 text-purple-200 hover:bg-purple-700/50 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-slate-700/50 border-purple-400/30 text-purple-200 hover:bg-red-700/50 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto p-4 space-y-6">
        {showReports && userRole === "admin" && (
          <Card className="bg-gradient-to-r from-slate-800/90 via-purple-800/90 to-slate-800/90 border-purple-500/30 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-white animate-text-glow flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Report Generator (Admin Only)
              </CardTitle>
              <CardDescription className="text-purple-200">
                Generate consolidated guarantor reports by matching client data with guarantor information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GuarantorInfoGenerator />
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-r from-slate-800/90 via-purple-800/90 to-slate-800/90 border-purple-500/30 shadow-xl backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Search by Client ID, Name, CO Name, or Branch"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSearch}
                    size="sm"
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  {searchQuery && (
                    <Button
                      onClick={clearSearch}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700/50 border-purple-400/30 text-purple-200 hover:bg-purple-700/50"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={syncData}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sync className="h-4 w-4 mr-2" />}
                  Sync Data
                </Button>

                {(isLoading || syncProgress > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-cyan-400 animate-bounce" />
                      <span className="text-sm text-purple-200 animate-pulse">{syncStatus}</span>
                    </div>
                    <div className="relative">
                      <Progress value={syncProgress} className="h-2 bg-slate-700/50" />
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-blue-400/20 to-purple-400/20 rounded-full animate-pulse"></div>
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full transition-all duration-300 animate-shine"
                        style={{ width: `${syncProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-cyan-400 font-mono animate-text-glow">{syncProgress}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {lastSync && <p className="text-sm text-purple-200 mt-2">Last sync: {lastSync}</p>}
          </CardContent>
        </Card>

        {showAdmin && (
          <Card className="bg-gradient-to-r from-slate-800/90 via-purple-800/90 to-slate-800/90 border-purple-500/30 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-white animate-text-glow">Admin Panel</CardTitle>
              <CardDescription className="text-purple-200">
                {userRole === "admin" ? "Full admin access - manage passwords and data" : "Limited access - view only"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userRole === "admin" && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">Password Management</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="password"
                        placeholder="New user password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="flex-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200 focus:border-cyan-400 focus:ring-cyan-400/20"
                      />
                      <Button
                        onClick={updateUserPassword}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                      >
                        Update User Password
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="password"
                        placeholder="New admin password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        className="flex-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200 focus:border-cyan-400 focus:ring-cyan-400/20"
                      />
                      <Button
                        onClick={updateAdminPassword}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                      >
                        Update Admin Password
                      </Button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-purple-400/30">
                    <Button
                      onClick={clearAllData}
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All Data
                    </Button>
                    <p className="text-xs text-purple-200 mt-1">
                      This will remove all offline data and require a new sync
                    </p>
                  </div>
                </>
              )}
              {userRole === "user" && (
                <p className="text-sm text-purple-200">Contact administrator to change passwords or manage data.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-r from-slate-800/90 via-purple-800/90 to-slate-800/90 border-purple-500/20 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-white animate-text-glow">
              {!hasSearched ? "Search Results" : `Records (${filteredRecords.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasSearched ? (
              <p className="text-center text-purple-200 py-8">
                Enter a Client ID, Name, CO Name, or Branch in the search box above to view records.
              </p>
            ) : filteredRecords.length === 0 ? (
              <p className="text-center text-purple-200 py-8">No records found. Try adjusting your search terms.</p>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {filteredRecords.map((record, index) => (
                  <div
                    key={index}
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6 shadow-2xl border border-purple-500/20 animate-pulse-glow"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>

                    <div className="relative z-10 space-y-3 sm:space-y-4">
                      <div className="text-center mb-4 sm:mb-6">
                        <div className="inline-block px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-lg shadow-lg">
                          <span className="text-xs sm:text-sm font-medium text-slate-900">Client ID</span>
                          <div className="text-xl sm:text-2xl font-bold text-slate-900 animate-shine">
                            {record["Client ID"] || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Name:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["Name"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Spouse:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["Spouse"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Product:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Product"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">CO Name:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["CO Name"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Cell No:</span>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <PhoneNumberLinks phone={record["Cell No"] || "-"} />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Area:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["Area"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Maturity Date:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Maturity Date"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Branch:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Branch"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Last Amount Paid:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Last Amount Paid"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Loan Amount:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Loan Amount"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Loan Cycle:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Loan Cycle"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Guarantor Name:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["Guarantor Name"] || "-"}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Guarantor Cell:
                          </span>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <PhoneNumberLinks phone={record["Guarantor Cell"] || "-"} />
                          </div>
                        </div>

                        <div className="sm:col-span-2 flex flex-col sm:flex-row sm:justify-between sm:items-start py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Address:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words sm:text-right sm:max-w-md">
                            {record["Address"] || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                    <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
