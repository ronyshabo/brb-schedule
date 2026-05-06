import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase/config'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import SchedulePage from './pages/SchedulePage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [barista, setBarista] = useState(null)  // scheduleUsers document
  const [loading, setLoading] = useState(true)
  const [showSignUp, setShowSignUp] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          try {
            let scheduleUserSnap = await getDoc(doc(db, 'scheduleUsers', currentUser.uid))
            if (!scheduleUserSnap.exists()) {
              // Try to auto-link by email from baristas collection
              const baristaQuery = query(
                collection(db, 'baristas'),
                where('email', '==', currentUser.email)
              )
              const baristaSnap = await getDocs(baristaQuery)
              if (!baristaSnap.empty) {
                const baristaDoc = baristaSnap.docs[0]
                const barista = baristaDoc.data()
                await setDoc(doc(db, 'scheduleUsers', currentUser.uid), {
                  uid: currentUser.uid,
                  baristaId: baristaDoc.id,
                  baristaName: barista.name,
                  email: currentUser.email,
                  createdAt: serverTimestamp(),
                })
                await updateDoc(doc(db, 'baristas', baristaDoc.id), {
                  uid: currentUser.uid,
                  linkedAt: serverTimestamp(),
                })
                scheduleUserSnap = await getDoc(doc(db, 'scheduleUsers', currentUser.uid))
              }
            }
            if (scheduleUserSnap.exists()) {
              setUser(currentUser)
              setBarista({ id: scheduleUserSnap.id, ...scheduleUserSnap.data() })
            } else {
              // Signed in but not a registered barista — sign them out immediately
              await signOut(auth)
              setUser(null)
              setBarista(null)
            }
          } catch {
            setUser(null)
            setBarista(null)
          }
      } else {
        setUser(null)
        setBarista(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    setUser(null)
    setBarista(null)
  }

  if (loading) {
    return (
      <div className="app-loading">
        <span>☕</span>
        <p>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return showSignUp ? (
      <SignUp setShowSignUp={setShowSignUp} />
    ) : (
      <Login setShowSignUp={setShowSignUp} />
    )
  }

  return (
    <div className="app">
      <nav className="navbar">
        <span className="navbar__brand">☕ BRB Schedule</span>
        <div className="navbar__right">
          <span className="navbar__user">
            {barista?.baristaName ?? user.email}
          </span>
          <button className="navbar__logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>
      <SchedulePage user={user} barista={barista} />
    </div>
  )
}

export default App
