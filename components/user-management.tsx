"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { authDB, type User } from "@/lib/auth-db"
import { Trash2, Edit2, Plus } from "lucide-react"

interface UserManagementProps {
  onClose?: () => void
}

export function UserManagement({ onClose }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "user" as "user" | "admin",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const allUsers = await authDB.getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      console.log("[v0] Error loading users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!formData.username.trim() || !formData.password.trim()) {
      toast({
        title: "Validation Error",
        description: "Username and password are required",
        variant: "destructive",
      })
      return
    }

    try {
      // Check if username already exists
      const existing = await authDB.getUserByUsername(formData.username)
      if (existing) {
        toast({
          title: "Error",
          description: "Username already exists",
          variant: "destructive",
        })
        return
      }

      await authDB.addUser({
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role,
        createdAt: new Date().toISOString(),
      })

      toast({
        title: "Success",
        description: `User "${formData.username}" added successfully`,
      })

      setFormData({ username: "", password: "", role: "user" })
      setShowAddForm(false)
      await loadUsers()
    } catch (error) {
      console.log("[v0] Error adding user:", error)
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive",
      })
    }
  }

  const handleUpdateUser = async () => {
    if (editingId === null || !formData.username.trim()) {
      return
    }

    try {
      await authDB.updateUser(editingId, {
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role,
      })

      toast({
        title: "Success",
        description: `User updated successfully`,
      })

      setEditingId(null)
      setFormData({ username: "", password: "", role: "user" })
      await loadUsers()
    } catch (error) {
      console.log("[v0] Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (id: number, username: string) => {
    if (confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        await authDB.deleteUser(id)
        toast({
          title: "Success",
          description: `User "${username}" deleted successfully`,
        })
        await loadUsers()
      } catch (error) {
        console.log("[v0] Error deleting user:", error)
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        })
      }
    }
  }

  const handleEdit = (user: User) => {
    setEditingId(user.id || null)
    setFormData({
      username: user.username,
      password: user.password,
      role: user.role,
    })
    setShowAddForm(false)
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingId(null)
    setFormData({ username: "", password: "", role: "user" })
  }

  return (
    <div className="space-y-4">
      <Card className="border-purple-500/20 bg-slate-800/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">User Management</CardTitle>
              <CardDescription className="text-purple-200">Add, edit, and delete users in the system</CardDescription>
            </div>
            <Button
              onClick={() => {
                setShowAddForm(!showAddForm)
                setEditingId(null)
                setFormData({ username: "", password: "", role: "user" })
              }}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
      </Card>

      {showAddForm || editingId !== null ? (
        <Card className="border-purple-500/20 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">{editingId !== null ? "Edit User" : "Add New User"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white">Username</label>
              <Input
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="mt-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white">Password</label>
              <Input
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 bg-slate-700/50 border-purple-400/30 text-white placeholder:text-purple-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as "user" | "admin" })}
                className="mt-1 w-full bg-slate-700/50 border border-purple-400/30 text-white placeholder:text-purple-200 rounded-md px-3 py-2"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={editingId !== null ? handleUpdateUser : handleAddUser}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {editingId !== null ? "Update User" : "Add User"}
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex-1 border-purple-400/30 bg-transparent">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-purple-500/20 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-purple-200">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-purple-200">No users found</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-slate-700/30 border border-purple-400/20 rounded-lg hover:border-purple-400/40 transition-all"
                >
                  <div>
                    <p className="font-semibold text-white">{user.username}</p>
                    <p className="text-xs text-purple-200">
                      Role: <span className="font-medium">{user.role}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(user)}
                      size="sm"
                      variant="outline"
                      className="border-purple-400/30 text-purple-200 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteUser(user.id || 0, user.username)}
                      size="sm"
                      variant="outline"
                      className="border-red-400/30 text-red-200 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
