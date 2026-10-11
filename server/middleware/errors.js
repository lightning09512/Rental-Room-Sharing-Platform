export function notFound(_req, res) {
  res.status(404).json({ error: "Không tìm thấy đường dẫn API.", code: "NOT_FOUND" })
}

export function errorHandler(error, _req, res, _next) {
  const databaseUnavailable = typeof error.code === "string" && (error.code.startsWith("08") || ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"].includes(error.code))
  const status = error.status || (error.name === "ZodError" ? 400 : error.code === "23505" ? 409 : error.code === "LIMIT_FILE_SIZE" ? 413 : error.message === "Chỉ nhận tệp hình ảnh." ? 400 : error.name === "MulterError" ? 400 : databaseUnavailable ? 503 : 500)
  const message = error.name === "ZodError"
    ? error.issues?.map((issue) => issue.message).join(" ") || "Dữ liệu chưa hợp lệ."
    : error.code === "23505" ? "Email, số điện thoại hoặc danh mục đã tồn tại."
    : error.code === "LIMIT_FILE_SIZE" ? "Ảnh vượt quá giới hạn dung lượng cho phép."
    : databaseUnavailable ? "Không thể kết nối dịch vụ dữ liệu. Vui lòng thử lại sau."
    : error.message === "Chỉ nhận tệp hình ảnh." ? error.message
    : status >= 500 && !error.status ? "Máy chủ gặp lỗi. Vui lòng thử lại sau." : error.message
  if (status >= 500) console.error(error)
  res.status(status).json({ error: message, code: error.code || "REQUEST_FAILED" })
}
