import { openDB } from 'idb'

const DB_NAME = 'concept-deep-dive'
const DB_VERSION = 2

let dbInstance = null
let dbPromise = null

async function getDB() {
  if (dbInstance) return dbInstance
  if (dbPromise) return dbPromise
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('concepts')) {
        db.createObjectStore('concepts', { keyPath: 'slug' })
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('threadConcepts')) {
          db.createObjectStore('threadConcepts', { keyPath: 'id' })
        }
      }
    },
  })
  dbInstance = await dbPromise
  return dbInstance
}

export function useLocalDB() {
  async function saveThreadConcept(threadId, slug, data) {
    const db = await getDB()
    await db.put('threadConcepts', {
      id: `${threadId}_${slug}`,
      threadId,
      slug,
      data,
      updatedAt: Date.now(),
    })
  }

  async function getThreadConcepts(threadId) {
    const db = await getDB()
    const all = await db.getAll('threadConcepts')
    const result = {}
    for (const record of all) {
      if (record.threadId === threadId) result[record.slug] = record.data
    }
    return result
  }

  async function deleteThreadConcepts(threadId) {
    const db = await getDB()
    const all = await db.getAll('threadConcepts')
    for (const record of all) {
      if (record.threadId === threadId) await db.delete('threadConcepts', record.id)
    }
  }

  return { saveThreadConcept, getThreadConcepts, deleteThreadConcepts }
}
