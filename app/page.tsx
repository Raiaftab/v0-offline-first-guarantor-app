"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Send as Sync, Settings, LogOut, Loader2, Database, Trash2, Phone, MessageCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { guarantorDB, type GuarantorRecord } from "@/lib/db"

const PASS_KEY = "appPassword"
const LAST_SYNC_KEY = "lastSync"

export default function GuarantorApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginPassword, setLoginPassword] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [records, setRecords] = useState<GuarantorRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<GuarantorRecord[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loginError, setLoginError] = useState("")
  const [recordCount, setRecordCount] = useState(0)
  const { toast } = useToast()

  // Initialize app
  useEffect(() => {
    initializeApp()
  }, [])

  // Initialize IndexedDB and check login status
  const initializeApp = async () => {
    console.log("[v0] Initializing app...")

    // Set default password if not exists
    if (!localStorage.getItem(PASS_KEY)) {
      localStorage.setItem(PASS_KEY, "admin123")
    }

    // Get last sync time
    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY)
    setLastSync(lastSyncTime)

    // Load offline data and get count
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
    // Remove any non-digit characters and ensure it starts with country code
    const cleaned = phone.replace(/\D/g, "")
    // If it doesn't start with country code, assume Pakistan (+92)
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

  // Authentication
  const handleLogin = () => {
    const storedPassword = localStorage.getItem(PASS_KEY)
    if (loginPassword === storedPassword) {
      setIsLoggedIn(true)
      setLoginError("")
      toast({
        title: "Login successful",
        description: "Welcome to Guarantor Report Viewer",
      })
    } else {
      setLoginError("Wrong password!")
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setLoginPassword("")
    setShowAdmin(false)
  }

  const updatePassword = () => {
    if (newPassword.trim()) {
      localStorage.setItem(PASS_KEY, newPassword.trim())
      setNewPassword("")
      toast({
        title: "Password updated",
        description: "Your password has been successfully changed",
      })
    }
  }

  const syncData = async () => {
    console.log("[v0] Starting data sync...")
    setIsLoading(true)
    try {
      const API_URL =
        "https://script.google.com/macros/s/AKfycbz8h-lfEIEK53trQ2R42p_UfaY9ALf0wSqIqGGL17SG7UCzrdk0Tajr39itkN0l2Amf/exec"

      console.log("[v0] Fetching from Google Script URL:", API_URL)

      try {
        const response = await fetch(API_URL, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })

        console.log("[v0] Response status:", response.status)
        console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Received data:", data)
        console.log("[v0] Data type:", typeof data)
        console.log("[v0] Data length:", Array.isArray(data) ? data.length : "Not an array")

        // Validate data structure
        if (!Array.isArray(data)) {
          console.log("[v0] Data is not an array, trying to extract array from response")
          // Sometimes the response might be wrapped in an object
          if (data && data.data && Array.isArray(data.data)) {
            console.log("[v0] Found data array in response.data")
            const actualData = data.data
            await guarantorDB.clearAndSave(actualData)
            setRecords(actualData)
            if (!hasSearched) {
              setFilteredRecords([])
            }
            setRecordCount(actualData.length)
          } else {
            throw new Error("Invalid data format received - not an array")
          }
        } else {
          console.log("[v0] Saving", data.length, "records to IndexedDB")
          await guarantorDB.clearAndSave(data)
          const count = await guarantorDB.getRecordCount()

          setRecords(data)
          if (!hasSearched) {
            setFilteredRecords([])
          }
          setRecordCount(count)
        }

        const syncTime = new Date().toLocaleString()
        localStorage.setItem(LAST_SYNC_KEY, syncTime)
        setLastSync(syncTime)

        toast({
          title: "Data synced successfully",
          description: `Successfully stored ${Array.isArray(data) ? data.length : data.data?.length || 0} records for offline use`,
        })
      } catch (fetchError) {
        console.log("[v0] Fetch error:", fetchError)
        console.log("[v0] Falling back to demo data due to fetch error")

        const demoData = [
          {
            "Client ID": "103002617",
            Name: "John Doe",
            "CO Name": "ABC Corp",
            Branch: "Main",
            "Cell No": "0300-1234567",
            "Guarantor Cell": "0301-7654321",
          },
          {
            "Client ID": "103002618",
            Name: "Jane Smith",
            "CO Name": "XYZ Ltd",
            Branch: "North",
            "Cell No": "0321-9876543",
            "Guarantor Cell": "0333-1111111",
          },
          {
            "Client ID": "103002619",
            Name: "Bob Johnson",
            "CO Name": "DEF Inc",
            Branch: "South",
            "Cell No": "0345-5555555",
            "Guarantor Cell": "0300-9999999",
          },
          {
            "Client ID": "103002620",
            Name: "Alice Brown",
            "CO Name": "GHI Co",
            Branch: "East",
            "Cell No": "0312-7777777",
            "Guarantor Cell": "0345-3333333",
          },
          {
            "Client ID": "103002621",
            Name: "Charlie Wilson",
            "CO Name": "JKL Corp",
            Branch: "West",
            "Cell No": "0333-4444444",
            "Guarantor Cell": "0321-8888888",
          },
        ]

        console.log("[v0] Saving demo data to IndexedDB...")
        await guarantorDB.clearAndSave(demoData)

        console.log("[v0] Getting updated records...")
        const updatedRecords = await guarantorDB.getAllRecords()
        const count = await guarantorDB.getRecordCount()

        console.log("[v0] Updated records count:", updatedRecords.length)
        setRecords(updatedRecords)
        if (!hasSearched) {
          setFilteredRecords([])
        }
        setRecordCount(count)

        const syncTime = new Date().toLocaleString()
        localStorage.setItem(LAST_SYNC_KEY, syncTime)
        setLastSync(syncTime)

        toast({
          title: "Using demo data",
          description: `Google Script failed to load. Using ${updatedRecords.length} demo records instead.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.log("[v0] Sync error:", error)
      toast({
        title: "Sync failed",
        description: "Error fetching data. Using offline data.",
        variant: "destructive",
      })
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
        {/* Animated background overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-gradient-x"></div>

        {/* Decorative elements */}
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
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 animate-gradient-x"></div>

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-r from-slate-800/90 via-purple-800/90 to-slate-800/90 border-b border-purple-500/30 p-4 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white animate-text-glow">Guarantor Reports</h1>
            <p className="text-sm text-purple-200 flex items-center gap-1 mt-1">
              <Database className="h-3 w-3" />
              {recordCount} records stored offline
            </p>
          </div>
          <div className="flex items-center gap-2">
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
        {/* Search and Sync Controls */}
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
              <Button
                onClick={syncData}
                disabled={isLoading}
                className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sync className="h-4 w-4 mr-2" />}
                Sync Data
              </Button>
            </div>
            {lastSync && <p className="text-sm text-purple-200 mt-2">Last sync: {lastSync}</p>}
          </CardContent>
        </Card>

        {/* Admin Panel */}
        {showAdmin && (
          <Card className="bg-gradient-to-r from-slate-800/90 via-purple-800/90 to-slate-800/90 border-purple-500/30 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-white animate-text-glow">Admin Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
                <Button
                  onClick={updatePassword}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                >
                  Update Password
                </Button>
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
                <p className="text-xs text-purple-200 mt-1">This will remove all offline data and require a new sync</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Card className="bg-gradient-to-r from-slate-800/90 via-purple-800/90 to-slate-800/90 border-purple-500/30 shadow-xl backdrop-blur-sm">
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
                    {/* Animated background overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-gradient-x"></div>

                    {/* Content */}
                    <div className="relative z-10 space-y-3 sm:space-y-4">
                      {/* Client ID - Featured */}
                      <div className="text-center mb-4 sm:mb-6">
                        <div className="inline-block px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-lg shadow-lg">
                          <span className="text-xs sm:text-sm font-medium text-slate-900">Client ID</span>
                          <div className="text-xl sm:text-2xl font-bold text-slate-900 animate-shine">
                            {record["Client ID"] || "-"}
                          </div>
                        </div>
                      </div>

                      {/* Data Fields - Mobile optimized grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                        {/* Name */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Name:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["Name"] || "-"}
                          </span>
                        </div>

                        {/* Spouse */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Spouse:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["Spouse"] || "-"}
                          </span>
                        </div>

                        {/* Product */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Product:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Product"] || "-"}
                          </span>
                        </div>

                        {/* CO Name */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">CO Name:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["CO Name"] || "-"}
                          </span>
                        </div>

                        {/* Cell No */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Cell No:</span>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <PhoneNumberLinks phone={record["Cell No"] || "-"} />
                          </div>
                        </div>

                        {/* Area */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Area:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["Area"] || "-"}
                          </span>
                        </div>

                        {/* Maturity Date */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Maturity Date:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Maturity Date"] || "-"}
                          </span>
                        </div>

                        {/* Branch */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Branch:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Branch"] || "-"}
                          </span>
                        </div>

                        {/* Last Amount Paid */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Last Amount Paid:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Last Amount Paid"] || "-"}
                          </span>
                        </div>

                        {/* Loan Amount */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Loan Amount:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Loan Amount"] || "-"}
                          </span>
                        </div>

                        {/* Loan Cycle */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Loan Cycle:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base">
                            {record["Loan Cycle"] || "-"}
                          </span>
                        </div>

                        {/* Guarantor Name */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Guarantor Name:
                          </span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words">
                            {record["Guarantor Name"] || "-"}
                          </span>
                        </div>

                        {/* Guarantor Cell */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">
                            Guarantor Cell:
                          </span>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <PhoneNumberLinks phone={record["Guarantor Cell"] || "-"} />
                          </div>
                        </div>

                        {/* Address - Full width on mobile and desktop */}
                        <div className="sm:col-span-2 flex flex-col sm:flex-row sm:justify-between sm:items-start py-2 border-b border-purple-400/20">
                          <span className="text-purple-300 font-medium text-xs sm:text-sm mb-1 sm:mb-0">Address:</span>
                          <span className="text-white font-semibold animate-text-glow text-sm sm:text-base break-words sm:text-right sm:max-w-md">
                            {record["Address"] || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Decorative elements */}
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
