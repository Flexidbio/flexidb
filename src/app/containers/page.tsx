"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from '@/components/auth-provider'

// API functions
const listContainers = async (token: string) => {
  const response = await fetch('/containers', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!response.ok) throw new Error('Failed to fetch containers')
  return response.json()
}

const createContainer = async (token: string, data: any) => {
  const response = await fetch('/containers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error('Failed to create container')
  return response.json()
}

const deleteContainer = async (token: string, id: number) => {
  const response = await fetch(`/containers/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!response.ok) throw new Error('Failed to delete container')
}

export default function ContainersPage() {
  const [containers, setContainers] = useState([])
  const [newContainer, setNewContainer] = useState({ name: '', db_type: '', env: {} })
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      fetchContainers()
    }
  }, [isAuthenticated])

  const fetchContainers = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      const data = await listContainers(token)
      setContainers(data)
    }
  }

  const handleCreateContainer = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    if (token) {
      await createContainer(token, newContainer)
      fetchContainers()
      setNewContainer({ name: '', db_type: '', env: {} })
    }
  }

  const handleDeleteContainer = async (id: number) => {
    const token = localStorage.getItem('token')
    if (token) {
      await deleteContainer(token, id)
      fetchContainers()
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Containers</h1>
      <Dialog>
        <DialogTrigger asChild>
          <Button>Create New Container</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Container</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateContainer} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newContainer.name}
                onChange={(e) => setNewContainer({ ...newContainer, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="db_type">Database Type</Label>
              <Select
                value={newContainer.db_type}
                onValueChange={(value) => setNewContainer({ ...newContainer, db_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select database type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Create</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Database Type</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {containers.map((container: any) => (
            <TableRow key={container.id}>
              <TableCell>{container.name}</TableCell>
              <TableCell>{container.db_type}</TableCell>
              <TableCell>
                <Button variant="destructive" onClick={() => handleDeleteContainer(container.id)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}