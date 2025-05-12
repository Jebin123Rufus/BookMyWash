console.log("Script loaded");

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    console.log("Form submitted");

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const regex = /^[a-z]+\.[0-9]{6}@[a-z]{3,5}\.ritchennai\.edu\.in$/;

    // Allow admin email as exception
    if (email === "adminrit@gmail.com" && name.toLowerCase() === "admin") {
      try {
        const res = await fetch("http://localhost:5000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message);
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("username", data.username);
          localStorage.setItem("email", email);
          window.location.href = "adminpage.html";
        } else {
          alert("Login failed: " + data.message);
        }
      } catch (err) {
        console.error("Request failed:", err);
        alert("Error submitting form");
      }
    } else if (regex.test(email)) {
      try {
        const res = await fetch("http://localhost:5000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email }),
        });

        const data = await res.json();
        console.log("Server response:", data);

        if (res.ok) {
          alert(data.message);
          // Save login state
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("username", data.username);
          localStorage.setItem("email", email);
          console.log("Username stored in localStorage:", email);
          // Admin redirect logic
          if (email === "adminrit@gmail.com" && name.toLowerCase() === "admin") {
            window.location.href = "adminpage.html";
          } else {
            window.location.href = "index.html";
          }
        } else {
          alert("Login failed: " + data.message);
        }
      } catch (err) {
        console.error("Request failed:", err);
        alert("Error submitting form");
      }
    } else {
      alert("Invalid email! Enter a valid college mail-id to Login");
    }
  });
