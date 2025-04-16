console.log("Script loaded");

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log("Form submitted");

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    console.log("Sending data:", { name, email });

    try {
        const res = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });

        const data = await res.json();
        console.log("Server response:", data);

        if (res.ok) {
            alert(data.message);
            // Save login state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', name); // optional
            window.location.href = 'index.html';
        } else {
            alert('Login failed: ' + data.message);
        }

    } catch (err) {
        console.error("Request failed:", err);
        alert("Error submitting form");
    }
});



