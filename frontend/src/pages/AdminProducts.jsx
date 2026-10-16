import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API = 'http://localhost:3000/api'

const emptyForm = {
  product_name: '',
  price: '',
  description: '',
  stock_quantity: '',
  image_url: '',
}

function AdminProducts() {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function getToken() {
    return localStorage.getItem('token')
  }

  function imageSrc(url) {
    if (!url) return ''

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    return `http://localhost:3000${url.startsWith('/') ? '' : '/'}${url}`
  }

  async function loadProducts() {
    const response = await fetch(`${API}/products`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || '載入商品失敗')
    }

    setProducts(
      Array.isArray(data) ? data : data.products || []
    )
  }

  useEffect(() => {
    const token = getToken()
    const memberText = localStorage.getItem('member')

    if (!token || !memberText) {
      navigate('/login')
      return
    }

    let member

    try {
      member = JSON.parse(memberText)
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('member')
      navigate('/login')
      return
    }

    if (
      member.is_admin !== true &&
      member.is_admin !== 1 &&
      member.is_admin !== 'true'
    ) {
      navigate('/products')
      return
    }

    loadProducts()
      .catch((err) => {
        setError(err.message || '載入商品失敗')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [navigate])

  function handleFieldChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]

    setError('')
    setMessage('')
    setImageFile(null)

    if (!file) {
      setPreview(form.image_url ? imageSrc(form.image_url) : '')
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      setError('圖片只接受 JPG、PNG 或 WebP 格式')
      event.target.value = ''
      setPreview(form.image_url ? imageSrc(form.image_url) : '')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('圖片大小不能超過 5 MB')
      event.target.value = ''
      setPreview(form.image_url ? imageSrc(form.image_url) : '')
      return
    }

    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setImageFile(null)
    setPreview('')
    setError('')
    setMessage('')

    const input = document.getElementById('product-image')
    if (input) input.value = ''
  }

  async function uploadImage() {
    if (!imageFile) {
      return form.image_url || null
    }

    const token = getToken()
    const body = new FormData()
    body.append('image', imageFile)

    const response = await fetch(`${API}/products/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || '圖片上傳失敗')
    }

    return data.image_url
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!form.product_name.trim()) {
      setError('請輸入商品名稱')
      return
    }

    if (
      form.price === '' ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      setError('價格必須是大於或等於 0 的數字')
      return
    }

    if (!form.description.trim()) {
      setError('請輸入商品說明')
      return
    }

    if (
      form.stock_quantity === '' ||
      !Number.isSafeInteger(Number(form.stock_quantity)) ||
      Number(form.stock_quantity) < 0
    ) {
      setError('庫存必須是大於或等於 0 的整數')
      return
    }

    setSaving(true)

    try {
      const imageUrl = await uploadImage()

      const payload = {
        product_name: form.product_name.trim(),
        price: Number(form.price),
        description: form.description.trim(),
        stock_quantity: Number(form.stock_quantity),
        image_url: imageUrl,
      }

      const token = getToken()
      const url = editingId
        ? `${API}/products/${editingId}`
        : `${API}/products`

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '儲存商品失敗')
      }

      await loadProducts()

      setMessage(
        editingId ? '商品修改成功' : '商品新增成功'
      )

      setForm(emptyForm)
      setEditingId(null)
      setImageFile(null)
      setPreview('')

      const input = document.getElementById('product-image')
      if (input) input.value = ''
    } catch (err) {
      setError(err.message || '儲存商品失敗')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(product) {
    setEditingId(product.product_id)

    setForm({
      product_name: product.product_name || '',
      price: String(product.price ?? ''),
      description: product.description || '',
      stock_quantity: String(product.stock_quantity ?? ''),
      image_url: product.image_url || '',
    })

    setImageFile(null)
    setPreview(
      product.image_url ? imageSrc(product.image_url) : ''
    )
    setError('')
    setMessage('')

    const input = document.getElementById('product-image')
    if (input) input.value = ''

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `確定要刪除商品「${product.product_name}」嗎？`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `${API}/products/${product.product_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '刪除商品失敗')
      }

      setProducts((current) =>
        current.filter(
          (item) => item.product_id !== product.product_id
        )
      )

      if (editingId === product.product_id) {
        resetForm()
      }

      setMessage('商品刪除成功')
    } catch (err) {
      setError(err.message || '刪除商品失敗')
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('member')
    navigate('/login')
  }

  const inputClass =
    'w-full rounded-lg border border-amber-200 bg-white p-3 outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600'

  return (
    <main className="min-h-screen bg-amber-50">
      <header className="mb-8 border-b border-amber-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-amber-900">
            香珍麻油｜商品管理
          </h1>

          <nav className="flex flex-wrap items-center gap-4">
            <Link
              className="text-amber-800 hover:underline"
              to="/products"
            >
              商品頁面
            </Link>

            <Link
              className="font-semibold text-amber-900 underline"
              to="/admin/products"
            >
              商品管理
            </Link>

            <Link
              className="text-amber-800 hover:underline"
              to="/admin/orders"
            >
              訂單管理
            </Link>

            <Link
              className="text-amber-800 hover:underline"
              to="/admin/members"
            >
              會員管理
            </Link>

            <button
              type="button"
              className="text-amber-800 hover:underline"
              onClick={logout}
            >
              登出
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-10">
        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
            {message}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="mb-10 space-y-5 rounded-xl border border-amber-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-amber-900">
              {editingId ? '修改商品' : '新增商品'}
            </h2>

            {editingId && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">
                正在編輯商品 #{editingId}
              </span>
            )}
          </div>

          <div>
            <label
              className="mb-1 block font-medium text-stone-700"
              htmlFor="product-name"
            >
              商品名稱
            </label>
            <input
              id="product-name"
              name="product_name"
              className={inputClass}
              value={form.product_name}
              onChange={handleFieldChange}
              required
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                className="mb-1 block font-medium text-stone-700"
                htmlFor="product-price"
              >
                商品價格（新臺幣）
              </label>
              <input
                id="product-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={form.price}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div>
              <label
                className="mb-1 block font-medium text-stone-700"
                htmlFor="product-stock"
              >
                商品庫存
              </label>
              <input
                id="product-stock"
                name="stock_quantity"
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={form.stock_quantity}
                onChange={handleFieldChange}
                required
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1 block font-medium text-stone-700"
              htmlFor="product-description"
            >
              商品說明
            </label>
            <textarea
              id="product-description"
              name="description"
              className={inputClass}
              rows="4"
              value={form.description}
              onChange={handleFieldChange}
              required
            />
          </div>

          <div>
            <label
              className="mb-1 block font-medium text-stone-700"
              htmlFor="product-image"
            >
              商品圖片（JPG、PNG、WebP，最多 5 MB）
            </label>
            <input
              id="product-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full rounded-lg border border-amber-200 bg-white p-3 file:mr-4 file:rounded-md file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:font-medium file:text-amber-900 hover:file:bg-amber-200"
              onChange={handleImageChange}
            />
          </div>

          {preview && (
            <div>
              <p className="mb-2 text-sm text-stone-600">
                圖片預覽
              </p>
              <img
                src={preview}
                alt="商品圖片預覽"
                className="h-48 w-48 rounded-lg border border-amber-200 bg-white object-contain p-2"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-800 px-5 py-2.5 font-medium text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? '儲存中...'
                : editingId
                  ? '儲存修改'
                  : '新增商品'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-amber-300 px-5 py-2.5 text-amber-900 hover:bg-amber-50"
              >
                取消修改
              </button>
            )}
          </div>
        </form>

        <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-amber-900">
              商品列表
            </h2>
            <span className="text-sm text-stone-500">
              共 {products.length} 項商品
            </span>
          </div>

          {loading && (
            <p className="py-6 text-stone-500">正在載入商品...</p>
          )}

          {!loading && products.length === 0 && (
            <p className="rounded-lg bg-amber-50 p-6 text-center text-stone-600">
              目前沒有商品資料。
            </p>
          )}

          {!loading && products.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-amber-200 bg-amber-100 text-amber-950">
                    <th className="p-3">圖片</th>
                    <th className="p-3">編號</th>
                    <th className="p-3">名稱</th>
                    <th className="p-3">價格</th>
                    <th className="p-3">庫存</th>
                    <th className="p-3">操作</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.product_id}
                      className="border-b border-amber-100 transition hover:bg-amber-50"
                    >
                      <td className="p-3">
                        {product.image_url ? (
                          <img
                            src={imageSrc(product.image_url)}
                            alt={product.product_name}
                            className="h-16 w-16 rounded-lg border border-amber-200 bg-white object-cover"
                          />
                        ) : (
                          <span className="text-sm text-stone-500">
                            無圖片
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-stone-600">
                        {product.product_id}
                      </td>

                      <td className="p-3 font-medium text-stone-800">
                        {product.product_name}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        NT$ {Number(product.price).toLocaleString('zh-TW')}
                      </td>

                      <td className="p-3">
                        {product.stock_quantity}
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700"
                          >
                            修改
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteProduct(product)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default AdminProducts