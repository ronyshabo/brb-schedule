import { useState, useEffect } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import '../styles/Auth.css'

function SignUp({ setShowSignUp }) {
  const [baristas, setBaristas] = useState([])   // unlinked baristas from Firestore
  const [selectedBaristaId, setSelectedBaristaId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchingBaristas, setFetchingBaristas] = useState(true)

  // Fetch baristas that have not yet been linked to a Firebase Auth account
  useEffect(() => {
    const fetchUnlinkedBaristas = async () => {
      try {
        const q = query(collection(db, 'baristas'), orderBy('name'))
        const snapshot = await getDocs(q)
        const unlinked = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((b) => b.active && !b.uid)
        setBaristas(unlinked)
      } catch (err) {
        setError('Could not load barista list. Please try again.')
        console.error(err)
      } finally {
        setFetchingBaristas(false)
      }
    }
    fetchUnlinkedBaristas()
  }, [])

  const getAuthErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'That email is already in use. Please log in instead.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.'
      default:
        return 'Could not create account. Please try again.'
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError(null)

    if (!selectedBaristaId) {
      setError('Please select your name from the list.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const selectedBarista = baristas.find((b) => b.id === selectedBaristaId)
    if (!selectedBarista) {
      setError('Selected barista not found. Please refresh and try again.')
      return
    }

    setLoading(true)

    try {
      const trimmedEmail = email.trim()

      // 1. Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password)
      const uid = credential.user.uid

      // 2. Link the barista doc to this UID
      await updateDoc(doc(db, 'baristas', selectedBaristaId), {
        uid,
        email: trimmedEmail,
        linkedAt: serverTimestamp(),
      })

      // 3. Create the scheduleUsers gate document
      await setDoc(doc(db, 'scheduleUsers', uid), {
        uid,
        baristaId: selectedBaristaId,
        baristaName: selectedBarista.name,
        email: trimmedEmail,
        createdAt: serverTimestamp(),
      })

      // onAuthStateChanged in App.jsx picks up the new user automatically
    } catch (err) {
      setError(getAuthErrorMessage(err.code))
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">☕</div>
        <h1>BRB Coffee</h1>
        <h2>Create Schedule Account</h2>

        {fetchingBaristas ? (
          <p className="loading-text">Loading barista list…</p>
        ) : baristas.length === 0 ? (
          <p className="error">
            No unregistered baristas found. Ask an admin to add your name in the baristas
            app first.
          </p>
        ) : (
          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label>Your Name</label>
              <select
                value={selectedBaristaId}
                onChange={(e) => setSelectedBaristaId(e.target.value)}
                required
              >
                <option value="">— Select your name —</option>
                {baristas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <small>Only baristas already in the system are listed.</small>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="link-btn" onClick={() => setShowSignUp(false)}>
            Log in
          </button>
        </p>
      </div>
    </div>
  )
}

export default SignUp
