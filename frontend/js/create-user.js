document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("create-user-form");

  document.getElementById("generate_password").addEventListener("click", () => {
    document.getElementById("temp_password").value = generateTempPassword();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      first_name: document.getElementById("first_name").value,
      last_name: document.getElementById("last_name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      department: document.getElementById("department").value,
      title: document.getElementById("title").value,
      role: document.getElementById("role").value,
      password: document.getElementById("temp_password").value,
    };

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (res.ok) {
      alert("✅ User created.");
      form.reset();
    } else {
      alert("❌ Error: " + result.message);
    }
  });

  function generateTempPassword() {
    return Math.random().toString(36).slice(-10);
  }
});

