import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://localhost:3000/api'

function Register() {
  const navigate = useNavigate()

  const [userName, setUserName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致。')
      return
    }

    if (password.length < 8) {
      setError('密碼至少需要 8 個字元。')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/members/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          user_name: userName.trim(),
          phone: phone.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '註冊失敗，請檢查輸入資料。')
      }

      setMessage('註冊成功！即將前往登入頁面。')

      setTimeout(() => {
        navigate('/login')
      }, 1000)
    } catch (err) {
      setError(err.message || '註冊時發生錯誤，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf8f3] px-6 py-12 text-stone-800">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <Link to="/" className="text-sm text-amber-800 hover:underline">
          ← 返回首頁
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-amber-900">
          註冊會員
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-500">
          建立帳號後，即可登入並選購麻油及食用油商品。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block text-sm font-medium">
            姓名
            <input
              type="text"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              autoComplete="name"
              maxLength={100}
              required
              placeholder="請輸入姓名"
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-amber-700"
            />
          </label>

          <label className="block text-sm font-medium">
            手機號碼
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              required
              placeholder="請輸入手機號碼"
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-amber-700"
            />
          </label>

          <label className="block text-sm font-medium">
            密碼
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="至少 8 個字元"
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-amber-700"
            />
          </label>

          <label className="block text-sm font-medium">
            確認密碼
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="請再次輸入密碼"
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-amber-700"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-amber-800 px-4 py-3 font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
          >
            {loading ? '註冊中……' : '建立會員帳號'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          已經有帳號？{' '}
          <Link
            to="/login"
            className="font-semibold text-amber-800 hover:underline"
          >
            前往登入
          </Link>
        </p>
      </section>
    </main>
  )
}

export default Register