"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Trash2, Search, UserCheck } from "lucide-react"

type UserRole = "citizen" | "police" | "admin"

interface ManagedUser {
  userId: string
  email: string
  name: string
  role: UserRole
  pincode?: string
  walletAddress?: string
  badgeNumber?: string
  policeStation?: string
  createdAt: string
}

const ROLE_COLORS: Record<UserRole, string> = {
  citizen: "bg-blue-100 text-blue-800",
  police: "bg-green-100 text-green-800",
  admin: "bg-purple-100 text-purple-800",
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "", email: "", password: "", role: "citizen" as UserRole, pincode: "", walletAddress: "",
    badgeNumber: "", policeStation: "",
  })

  // Edit dialog
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [editForm, setEditForm] = useState({ name: "", pincode: "", walletAddress: "", badgeNumber: "", policeStation: "" })
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = roleFilter !== "all" ? `?role=${roleFilter}` : ""
      const res = await fetch(`/api/admin/users${params}`)
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers(data.users)
    } catch {
      toast({ title: "Error", description: "Failed to load users.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [roleFilter, toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.userId.toLowerCase().includes(search.toLowerCase())
  )

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast({ title: "Validation", description: "Name, email, and password are required.", variant: "destructive" })
      return
    }
    if (createForm.role === "police" && createForm.pincode && !/^\d{6}$/.test(createForm.pincode)) {
      toast({ title: "Validation", description: "Pincode must be 6 digits.", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "User created", description: `${data.user.userId} created successfully.` })
      setShowCreate(false)
      setCreateForm({ name: "", email: "", password: "", role: "citizen", pincode: "", walletAddress: "", badgeNumber: "", policeStation: "" })
      fetchUsers()
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to create user.", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = (u: ManagedUser) => {
    setEditUser(u)
    setEditForm({ name: u.name, pincode: u.pincode || "", walletAddress: u.walletAddress || "", badgeNumber: u.badgeNumber || "", policeStation: u.policeStation || "" })
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: editUser.userId, ...editForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "Saved", description: "User updated." })
      setEditUser(null)
      fetchUsers()
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to save.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users?id=${deleteTarget.userId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "Deleted", description: `User ${deleteTarget.userId} removed.` })
      setDeleteTarget(null)
      fetchUsers()
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to delete.", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Create and manage citizens, police officers, and admins.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="citizen">Citizen</SelectItem>
            <SelectItem value="police">Police</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            {loading ? "Loading…" : `${filtered.length} user${filtered.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase">
                    <th className="text-left py-2 pr-4">Name / Email</th>
                    <th className="text-left py-2 pr-4">ID</th>
                    <th className="text-left py-2 pr-4">Role</th>
                    <th className="text-left py-2 pr-4">Pincode</th>
                    <th className="text-left py-2 pr-4">Created</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.userId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{u.userId}</td>
                      <td className="py-3 pr-4">
                        <Badge className={`${ROLE_COLORS[u.role]} text-xs font-medium border-0`}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">{u.pincode || "—"}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create user dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="password" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} placeholder="Temporary password" />
            </div>
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm((p) => ({ ...p, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Citizen</SelectItem>
                  <SelectItem value="police">Police Officer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createForm.role === "police" && (
              <>
                <div className="space-y-1">
                  <Label>Jurisdiction Pincode</Label>
                  <Input
                    value={createForm.pincode}
                    onChange={(e) => setCreateForm((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    placeholder="6-digit area pincode"
                    maxLength={6}
                    inputMode="numeric"
                  />
                  <p className="text-xs text-muted-foreground">FIRs from this pincode area will be visible to this officer.</p>
                </div>
                <div className="space-y-1">
                  <Label>Badge / Service Number</Label>
                  <Input value={createForm.badgeNumber} onChange={(e) => setCreateForm((p) => ({ ...p, badgeNumber: e.target.value }))} placeholder="e.g. MH-12345" />
                </div>
                <div className="space-y-1">
                  <Label>Police Station</Label>
                  <Input value={createForm.policeStation} onChange={(e) => setCreateForm((p) => ({ ...p, policeStation: e.target.value }))} placeholder="e.g. Andheri Police Station" />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Wallet Address (optional)</Label>
              <Input value={createForm.walletAddress} onChange={(e) => setCreateForm((p) => ({ ...p, walletAddress: e.target.value }))} placeholder="0x…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.userId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            {editUser?.role === "police" && (
              <>
                <div className="space-y-1">
                  <Label>Jurisdiction Pincode</Label>
                  <Input
                    value={editForm.pincode}
                    onChange={(e) => setEditForm((p) => ({ ...p, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    placeholder="6-digit area pincode"
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Badge / Service Number</Label>
                  <Input value={editForm.badgeNumber} onChange={(e) => setEditForm((p) => ({ ...p, badgeNumber: e.target.value }))} placeholder="e.g. MH-12345" />
                </div>
                <div className="space-y-1">
                  <Label>Police Station</Label>
                  <Input value={editForm.policeStation} onChange={(e) => setEditForm((p) => ({ ...p, policeStation: e.target.value }))} placeholder="e.g. Andheri Police Station" />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Wallet Address</Label>
              <Input value={editForm.walletAddress} onChange={(e) => setEditForm((p) => ({ ...p, walletAddress: e.target.value }))} placeholder="0x…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span> ({deleteTarget?.email})?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
