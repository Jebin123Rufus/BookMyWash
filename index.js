// Booking data
let bookings = [];

// Fetch bookings from backend on load
async function fetchBookings(email) {
  try {
    const res = await fetch(`http://localhost:5000/api/bookings?email=${encodeURIComponent(email)}`);
    bookings = await res.json();
    generateBookingCards();
  } catch (err) {
    bookings = [];
    generateBookingCards();
  }
}

// Fetch all bookings for slot availability
let allBookings = [];

async function fetchAllBookings() {
  try {
    const res = await fetch('http://localhost:5000/api/all-bookings');
    allBookings = await res.json();
  } catch (err) {
    allBookings = [];
  }
}

// Helper to check if a slot is booked for a machine
function isSlotBooked(machineId, date, timeSlot) {
  return allBookings.some(b =>
    b.machine && b.machine.id === machineId &&
    b.date === date &&
    b.timeSlot === timeSlot &&
    b.status === 'upcoming'
  );
}

// Create booking card
function createBookingCard(booking) {
  const bookingCard = document.createElement("div");
  bookingCard.classList.add("booking-card");
  bookingCard.dataset.id = booking.id;

  bookingCard.innerHTML = `
    <div class="booking-card-header" style="display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 0.5rem;">
      <div style="flex: 1;">
        <div class="booking-card-title">${booking.date}</div>
        <div class="booking-card-description">${booking.timeSlot}</div>
        <div class="booking-machine-info" style="margin-top: 8px; display: flex; align-items: center;">
          <div>
            <div class="booking-machine-name" style="font-weight: 500;">${booking.machine.name}</div>
            <div class="booking-machine-location" style="font-size: 0.85em; color: #64748b;">${booking.machine.location}</div>
          </div>
          <div class="machine-icon-wrapper" style="margin-left: 12px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon" style="color: var(--primary);">
              ${
                booking.machine.type === "washer"
                  ? '<rect width="18" height="20" x="3" y="2" rx="2"></rect><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>'
                  : '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>'
              }
            </svg>
          </div>
        </div>
      </div>
      <div class="booking-qr" style="margin-left: 16px; display: flex; align-items: flex-start; height: 100%;"><canvas id="qr-${booking._id}" style="width:128px;height:128px;"></canvas></div>
    </div>
    <!-- Remove extra content and whitespace below header -->
  `;

  // Generate QR code for upcoming bookings
  if (booking.status === "upcoming") {
    setTimeout(() => {
      const qrCanvas = bookingCard.querySelector(`#qr-${booking._id}`);
      if (qrCanvas) {
        const qrContent = booking.qrData || JSON.stringify({
          _id: booking._id,
          date: booking.date,
          timeSlot: booking.timeSlot,
          machine: booking.machine,
          email: booking.email
        });
        new QRious({
          element: qrCanvas,
          value: qrContent,
          size: 128 // Enlarged QR size
        });
      }
    }, 0);
  }

  return bookingCard;
}

function generateBookingCards() {
  const upcomingBookingsList = document.getElementById(
    "upcoming-bookings-list"
  );
  const upcomingHeading = document.getElementById("upcoming-heading");

  // Clear existing booking cards
  upcomingBookingsList.innerHTML = "";

  // Filter bookings
  const upcomingBookings = bookings.filter(
    (booking) => booking.status === "upcoming"
  );

  // Update the Upcoming heading with the count
  if (upcomingHeading) {
    upcomingHeading.textContent = `Upcoming(${upcomingBookings.length})`;
  }

  // Generate upcoming booking cards
  upcomingBookings.forEach((booking) => {
    const bookingCard = createBookingCard(booking);
    upcomingBookingsList.appendChild(bookingCard);
  });
}

// Add booking to backend
async function addBooking(booking) {
  // Save to backend (do not send id)
  const res = await fetch('http://localhost:5000/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking)
  });
  const data = await res.json();
  if (!res.ok) return;
  // Use MongoDB _id as booking id
  const bookingId = data.booking._id;
  // Generate QR data with _id
  const qrData = JSON.stringify({
    _id: bookingId,
    date: booking.date,
    timeSlot: booking.timeSlot,
    machine: booking.machine,
    email: booking.email
  });
  // Update booking with QR data
  await fetch(`http://localhost:5000/api/bookings/${bookingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrData })
  });
  // Refetch bookings to update UI
  await fetchBookings(booking.email);
}

// Utility to parse slot end time and return a JS Date object for slot end + 10 minutes
function getSlotExpiryDate(booking) {
  // booking.date is like 'Thursday, April 24, 2025'
  // booking.timeSlot is like '10:00-11:00'
  const dateStr = booking.date;
  const slotEnd = booking.timeSlot.split('-')[1]; // '11:00'
  // Try to parse the date and time robustly
  // Convert to a format like 'April 24, 2025 11:00'
  const dateParts = dateStr.split(', ');
  // dateParts[1] = 'April 24', dateParts[2] = '2025'
  const dateForParse = `${dateParts[1]}, ${dateParts[2]} ${slotEnd}`;
  let dateObj = new Date(dateForParse);
  // If parsing failed, fallback to Date(dateStr + ' ' + slotEnd)
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date(dateStr + ' ' + slotEnd);
  }
  // Add 10 minutes for expiry
  dateObj.setMinutes(dateObj.getMinutes() + 10);
  return dateObj;
}

// Remove expired bookings from UI and DB, alert user if any expired
async function removeExpiredBookingsAndAlert(email) {
  const now = new Date();
  // Use localStorage to track which expired bookings have been alerted
  let alertedIds = JSON.parse(localStorage.getItem('expiredBookingAlerts') || '[]');
  const expired = bookings.filter(b => {
    if (b.status !== 'upcoming') return false;
    const expiry = getSlotExpiryDate(b);
    return now > expiry && !alertedIds.includes(b._id);
  });
  if (expired.length > 0) {
    // Format message for each expired booking
    const msg = expired.map(b => `• ${b.date} (${b.timeSlot})`).join('\n');
    alert(`The following bookings have expired and will be removed:\n${msg}`);
    // Remove from DB
    for (const b of expired) {
      await fetch(`http://localhost:5000/api/bookings/${b._id}`, { method: 'DELETE' });
      alertedIds.push(b._id);
    }
    // Remove from local array
    bookings = bookings.filter(b => !expired.includes(b));
    generateBookingCards();
    // Save alerted IDs so the same alert doesn't show again
    localStorage.setItem('expiredBookingAlerts', JSON.stringify(alertedIds));
  }
}

// Free Wash header button logic
const freeWashHeaderBtn = document.getElementById("free-wash-header-btn");
async function fetchAndUpdateFreeWashHeaderBtn() {
  const email = localStorage.getItem("email");
  if (!email) return;
  try {
    const res = await fetch(`http://localhost:5000/api/free-wash?email=${encodeURIComponent(email)}&t=${Date.now()}`);
    const data = await res.json();
    const count = data.freeWash || 0;
    freeWashHeaderBtn.textContent = `Free Wash (${count})`;
  } catch {
    freeWashHeaderBtn.textContent = 'Free Wash (0)';
  }
}
if (freeWashHeaderBtn) {
  freeWashHeaderBtn.style.display = 'inline-block';
  freeWashHeaderBtn.textContent = 'Free Wash (0)';
  fetchAndUpdateFreeWashHeaderBtn();
  setInterval(fetchAndUpdateFreeWashHeaderBtn, 3000);
  window.addEventListener("storage", fetchAndUpdateFreeWashHeaderBtn);
  document.querySelector('.tab-button[data-tab="book"]').addEventListener('click', fetchAndUpdateFreeWashHeaderBtn);
  window.addEventListener('focus', fetchAndUpdateFreeWashHeaderBtn);
  freeWashHeaderBtn.addEventListener("click", async function () {
    const email = localStorage.getItem("email");
    if (!email) return;
    // Check count from backend
    const res = await fetch(`http://localhost:5000/api/free-wash?email=${encodeURIComponent(email)}&t=${Date.now()}`);
    const data = await res.json();
    const count = data.freeWash || 0;
    if (count === 0) {
      alert("You do not have a free wash available.");
      return;
    }
    // Validate selections
    const selectedDate = document.getElementById("selected-date").textContent;
    const selectedTimeSlot = document.getElementById("time-slot-select").value;
    const selectedMachine = document.querySelector(".machine-card.selected");
    if (!selectedDate || selectedDate === "Select a date") {
      alert("Please select a date before confirming your booking.");
      return;
    }
    if (!selectedTimeSlot) {
      alert("Please select a time slot before confirming your booking.");
      return;
    }
    if (!selectedMachine) {
      alert("Please select a machine before confirming your booking.");
      return;
    }
    if (isSlotBooked(selectedMachine.dataset.id, selectedDate, selectedTimeSlot)) {
      alert("This slot is already booked for the selected machine.");
      return;
    }
    // Book for free
    const newBooking = {
      id: `b${Date.now()}`,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      machine: {
        id: selectedMachine.dataset.id,
        name: selectedMachine.querySelector(".machine-card-title").textContent,
        type: selectedMachine.querySelector(".icon").innerHTML.includes("rect") ? "washer" : "dryer",
        location: selectedMachine.querySelector(".machine-card-description").textContent,
      },
      status: "upcoming",
      email
    };
    await addBooking(newBooking);
    // Decrement free wash count in backend
    await fetch('http://localhost:5000/api/free-wash/decrement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    fetchAndUpdateFreeWashHeaderBtn();
    document.querySelector('.tab-button[data-tab="mybookings"]').click();
    alert("Free wash booking successful!");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Redirect to login page if not logged in
  if (!localStorage.getItem("isLoggedIn")) {
    window.location.href = "login.html";
    return;
  }

  // Get the username from localStorage
  const username = localStorage.getItem("username");
  const email = localStorage.getItem("email");

  // Update the avatar span with the first character of the username
  const avatarSpan = document.querySelector(".avatar span");
  if (username && avatarSpan) {
    avatarSpan.textContent = username.charAt(0).toUpperCase(); // Set the first character in uppercase
  }

  // Update the dropdown username and email
  const dropdownUsername = document.getElementById("dropdown-username");
  const dropdownEmail = document.getElementById("dropdown-email");
  if (dropdownUsername) dropdownUsername.textContent = username;
  if (dropdownEmail) dropdownEmail.textContent = email;

  //Logout functionality
  const logoutButton = document.getElementById("logout-button");
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    window.location.href = "login.html";
  });

  // User dropdown
  const userMenuButton = document.getElementById("user-menu-button");
  const userDropdown = document.getElementById("user-dropdown");

  userMenuButton.addEventListener("click", (event) => {
    userDropdown.classList.toggle("active");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (event) => {
    if (
      !userMenuButton.contains(event.target) &&
      !userDropdown.contains(event.target)
    ) {
      userDropdown.classList.remove("active");
    }
  });

  // Main tabs
  const tabButtons = document.querySelectorAll(".tab-button[data-tab]");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");

      // Remove active class from all buttons and contents
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      this.classList.add("active");
      document.getElementById(`${tabId}-tab`).classList.add("active");
    });
  });

  // Remove all code related to bookingsTabButtons and bookingsTabContents

  // Calendar functionality
  const datePickerButton = document.getElementById("date-picker-button");
  const calendarPopup = document.getElementById("calendar-popup");
  const selectedDateElement = document.getElementById("selected-date");
  const currentMonthYearElement = document.getElementById("current-month-year");
  const prevMonthButton = document.getElementById("prev-month");
  const nextMonthButton = document.getElementById("next-month");
  const calendarGrid = document.querySelector(".calendar-grid");

  const currentDate = new Date();
  let selectedDate = null;
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();

  // Format date for display
  function formatDate(date) {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString(undefined, options);
  }

  // Update calendar month/year display
  function updateCalendarHeader() {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    currentMonthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  }

  // Generate calendar days
  function generateCalendarDays() {
    // Clear existing calendar days
    const dayElements = document.querySelectorAll(".calendar-day");
    dayElements.forEach((day) => day.remove());

    // Get first day of month and number of days in month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Get days from previous month
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Add days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayElement = document.createElement("div");
      dayElement.classList.add("calendar-day", "other-month");
      dayElement.textContent = daysInPrevMonth - i;
      calendarGrid.appendChild(dayElement);
    }

    // Add days for current month
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const dayElement = document.createElement("div");
      dayElement.classList.add("calendar-day");
      dayElement.textContent = i;

      // Check if day is before today
      const dayDate = new Date(currentYear, currentMonth, i);
      if (
        dayDate <
        new Date(today.getFullYear(), today.getMonth(), today.getDate())
      ) {
        dayElement.classList.add("disabled");
      } else {
        // Check if day is selected
        if (
          selectedDate &&
          i === selectedDate.getDate() &&
          currentMonth === selectedDate.getMonth() &&
          currentYear === selectedDate.getFullYear()
        ) {
          dayElement.classList.add("selected");
        }

        // Add click event
        dayElement.addEventListener("click", function () {
          if (!this.classList.contains("disabled")) {
            // Remove selected class from all days
            document
              .querySelectorAll(".calendar-day")
              .forEach((day) => day.classList.remove("selected"));

            // Add selected class to clicked day
            this.classList.add("selected");

            // Update selected date
            selectedDate = new Date(currentYear, currentMonth, i);
            selectedDateElement.textContent = formatDate(selectedDate);

            // Close calendar popup
            calendarPopup.classList.remove("active");
          }
        });
      }

      calendarGrid.appendChild(dayElement);
    }

    // Add days for next month
    const totalDays = firstDay + daysInMonth;
    const remainingDays = 7 - (totalDays % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const dayElement = document.createElement("div");
        dayElement.classList.add("calendar-day", "other-month");
        dayElement.textContent = i;
        calendarGrid.appendChild(dayElement);
      }
    }
  }

  // Initialize calendar
  updateCalendarHeader();
  generateCalendarDays();

  // Date picker button click
  datePickerButton.addEventListener("click", () => {
    calendarPopup.classList.toggle("active");
  });

  // Previous month button click
  prevMonthButton.addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updateCalendarHeader();
    generateCalendarDays();
  });

  // Next month button click
  nextMonthButton.addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    updateCalendarHeader();
    generateCalendarDays();
  });

  // Close calendar when clicking outside
  document.addEventListener("click", (event) => {
    if (
      !datePickerButton.contains(event.target) &&
      !calendarPopup.contains(event.target)
    ) {
      calendarPopup.classList.remove("active");
    }
  });

  // Machine filter buttons
  const filterButtons = document.querySelectorAll(".filter-button");
  const machineGrid = document.getElementById("machine-grid");

  // Machine data
  const machines = [
    {
      id: "w1",
      type: "washer",
      name: "Washer 1",
      status: "available",
      location: "Ground Floor",
    },
    {
      id: "w2",
      type: "washer",
      name: "Washer 2",
      status: "available", // changed from "booked" to "available"
      location: "Ground Floor",
    },
    {
      id: "w3",
      type: "washer",
      name: "Washer 3",
      status: "available",
      location: "First Floor",
    },
    {
      id: "w4",
      type: "washer",
      name: "Washer 4",
      status: "maintenance",
      location: "First Floor",
    },
    {
      id: "d1",
      type: "dryer",
      name: "Dryer 1",
      status: "available",
      location: "Ground Floor",
    },
    {
      id: "d2",
      type: "dryer",
      name: "Dryer 2",
      status: "available",
      location: "First Floor",
    },
  ];

  // Generate machine cards
  function generateMachineCards(filter = "all") {
    // Clear existing machine cards
    machineGrid.innerHTML = "";

    // Filter machines
    const filteredMachines =
      filter === "all"
        ? machines
        : machines.filter((machine) => machine.type === filter);

    // Get selected date and time slot
    const date = selectedDate ? formatDate(selectedDate) : null;
    const timeSlot = document.getElementById("time-slot-select").value;

    // Check if slot is in the past (for today)
    function isSlotInPast(selectedDate, timeSlot) {
      if (!selectedDate || !timeSlot) return false;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sel = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      if (sel.getTime() !== today.getTime()) return false;
      // Parse slot start time
      const slotStart = timeSlot.split("-")[0]; // e.g. '08:00'
      const [startHour, startMin] = slotStart.split(":").map(Number);
      const slotStartDate = new Date(sel);
      slotStartDate.setHours(startHour, startMin, 0, 0);
      return now >= slotStartDate;
    }

    // Generate machine cards
    filteredMachines.forEach((machine) => {
      const machineCard = document.createElement("div");
      machineCard.classList.add("machine-card");
      machineCard.dataset.id = machine.id;

      // Check if slot is booked for this machine
      let slotBooked = false;
      if (date && timeSlot) {
        slotBooked = isSlotBooked(machine.id, date, timeSlot);
        // Mark as unavailable if slot is in the past for today
        if (!slotBooked && selectedDate && isSlotInPast(selectedDate, timeSlot)) {
          slotBooked = true;
        }
      }
      if (machine.status !== "available" || slotBooked) {
        machineCard.classList.add("unavailable");
      }

      machineCard.innerHTML = `
          <div class="machine-card-header">
            <div>
              <div class="machine-card-title">${machine.name}</div>
              <div class="machine-card-description">${machine.location}</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
              ${
                machine.type === "washer"
                  ? '<rect width="18" height="20" x="3" y="2" rx="2"></rect><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>'
                  : '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>'
              }
            </svg>
          </div>
          <div class="machine-card-content">
            <div class="badge ${
              machine.status === "available" && !slotBooked
                ? "badge-outline"
                : machine.status === "booked" || slotBooked
                ? "badge-secondary"
                : "badge-destructive"
            }">
              ${
                machine.status === "available" && !slotBooked
                  ? "Available"
                  : machine.status === "booked" || slotBooked
                  ? (selectedDate && isSlotInPast(selectedDate, timeSlot) ? "Not Available" : "Booked")
                  : "Not Available"
              }
            </div>
          </div>
        `;

      // Add click event for available machines
      if (machine.status === "available" && !slotBooked) {
        machineCard.addEventListener("click", function () {
          // Remove selected class from all machine cards
          document
            .querySelectorAll(".machine-card")
            .forEach((card) => card.classList.remove("selected"));

          // Add selected class to clicked machine card
          this.classList.add("selected");
        });
      }

      machineGrid.appendChild(machineCard);
    });
  }

  // Initialize machine cards
  generateMachineCards();

  // Filter button click
  filterButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const filter = this.getAttribute("data-filter");

      // Remove active class from all filter buttons
      filterButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked filter button
      this.classList.add("active");

      // Generate machine cards with filter
      generateMachineCards(filter);
    });
  });

  // When date or time slot changes, regenerate machine cards
  function onDateOrTimeSlotChange() {
    generateMachineCards(document.querySelector('.filter-button.active').getAttribute('data-filter'));
  }

  // Hook into date and time slot changes
  document.getElementById('time-slot-select').addEventListener('change', onDateOrTimeSlotChange);
  // When a date is picked, also update machine cards
  const origCalendarDayClick = generateCalendarDays;
  generateCalendarDays = function() {
    origCalendarDayClick.apply(this, arguments);
    document.querySelectorAll('.calendar-day').forEach(day => {
      day.addEventListener('click', async function() {
        await fetchAllBookings();
        onDateOrTimeSlotChange();
      });
    });
  };

  // Also update on tab switch to booking tab
  document.querySelector('.tab-button[data-tab="book"]').addEventListener('click', async function() {
    await fetchAllBookings();
    onDateOrTimeSlotChange();
  });

  // Initial fetch of all bookings
  await fetchAllBookings();

  // Booking form submission
  const bookingForm = document.getElementById("booking-form");
  const confirmBookingButton = document.getElementById("confirm-booking");

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get form values
    const studentId = document.getElementById("student-id").value;
    const email = document.getElementById("email").value;
    const notes = document.getElementById("notes").value;

    // Validate form
    if (!studentId || !email) {
      showToast("Error", "Please fill in all required fields.");
      return;
    }

    // Check if date and time slot are selected
    if (!selectedDate) {
      showToast("Error", "Please select a date.");
      return;
    }

    const timeSlot = document.getElementById("time-slot-select").value;
    if (!timeSlot) {
      showToast("Error", "Please select a time slot.");
      return;
    }

    // Check if machine is selected
    const selectedMachine = document.querySelector(".machine-card.selected");
    if (!selectedMachine) {
      showToast("Error", "Please select a machine.");
      return;
    }

    // Check if slot is already booked (client-side check)
    if (isSlotBooked(selectedMachine.dataset.id, selectedDate ? formatDate(selectedDate) : '', timeSlot)) {
      showToast("Error", "This slot is already booked for the selected machine.");
      return;
    }

    // Disable button and show loading state
    confirmBookingButton.disabled = true;
    confirmBookingButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        Processing
      `;

    // Simulate API call
    setTimeout(async () => {
      // Reset form
      bookingForm.reset();
      selectedDate = null;
      selectedDateElement.textContent = "Select a date";
      document
        .querySelectorAll(".machine-card")
        .forEach((card) => card.classList.remove("selected"));

      // Reset button
      confirmBookingButton.disabled = false;
      confirmBookingButton.textContent = "Confirm Booking";

      // Show success toast
      showToast(
        "Booking Confirmed",
        "Your laundry slot has been booked successfully."
      );

      // Switch to My Bookings tab
      document.querySelector('.tab-button[data-tab="mybookings"]').click();

      // Add new booking to upcoming bookings
      const newBooking = {
        id: "b" + (Math.floor(Math.random() * 1000) + 1),
        date: selectedDate ? formatDate(selectedDate) : "April 20, 2025",
        timeSlot: timeSlot,
        machine: {
          id: selectedMachine.dataset.id,
          name: selectedMachine.querySelector(".machine-card-title")
            .textContent,
          type: selectedMachine
            .querySelector(".icon")
            .innerHTML.includes("rect")
            ? "washer"
            : "dryer",
          location: selectedMachine.querySelector(".machine-card-description")
            .textContent,
        },
        status: "upcoming",
        email // <-- add this
      };
      await addBooking(newBooking);
    }, 1500);
  });

  // Cancel booking
  function cancelBooking(bookingId) {
    const index = bookings.findIndex((booking) => booking.id === bookingId);
    if (index !== -1) {
      bookings.splice(index, 1);
      generateBookingCards();
      showToast(
        "Booking Cancelled",
        "Your booking has been cancelled successfully."
      );
    }
  }

  // Initialize booking cards
  await fetchBookings(email);
  await removeExpiredBookingsAndAlert(email);

  // Cancel modal
  const cancelModal = document.getElementById("cancel-modal");
  const cancelModalClose = document.getElementById("cancel-modal-close");
  const confirmCancellation = document.getElementById("confirm-cancellation");
  let currentCancellationId = null;

  function showCancelModal(bookingId) {
    currentCancellationId = bookingId;
    cancelModal.classList.add("active");
  }

  cancelModalClose.addEventListener("click", () => {
    cancelModal.classList.remove("active");
    currentCancellationId = null;
  });

  confirmCancellation.addEventListener("click", () => {
    if (currentCancellationId) {
      cancelBooking(currentCancellationId);
      cancelModal.classList.remove("active");
      currentCancellationId = null;
    }
  });

  // Close modal when clicking on overlay
  cancelModal.querySelector(".modal-overlay").addEventListener("click", () => {
    cancelModal.classList.remove("active");
    currentCancellationId = null;
  });

  // Toast notification
  const toast = document.getElementById("toast");
  const toastTitle = toast.querySelector(".toast-title");
  const toastDescription = toast.querySelector(".toast-description");
  let toastTimeout;

  function showToast(title, description) {
    toastTitle.textContent = title;
    toastDescription.textContent = description;

    toast.classList.add("active");

    // Clear existing timeout
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    // Hide toast after 3 seconds
    toastTimeout = setTimeout(() => {
      toast.classList.remove("active");
    }, 3000);
  }

  // Free Wash button logic
  const freeWashBtn = document.getElementById("free-wash-btn");
  function updateFreeWashBtn() {
    const email = localStorage.getItem("email");
    let freeWashes = JSON.parse(localStorage.getItem("freeWashes") || '{}');
    const count = freeWashes[email] || 0;
    if (freeWashBtn) {
      freeWashBtn.textContent = `Free Wash(${count})`;
    }
  }
  if (freeWashBtn) {
    updateFreeWashBtn();
    window.addEventListener("storage", function (e) {
      if (e.key === "freeWashes" || e.key === "freeWashes_update") updateFreeWashBtn();
    });
    document.querySelector('.tab-button[data-tab="book"]').addEventListener('click', updateFreeWashBtn);
    window.addEventListener('focus', updateFreeWashBtn);
    freeWashBtn.addEventListener("click", async function () {
      updateFreeWashBtn(); // Always update before action
      const email = localStorage.getItem("email");
      let freeWashes = JSON.parse(localStorage.getItem("freeWashes") || '{}');
      const count = freeWashes[email] || 0;
      if (count === 0) {
        alert("You do not have a free wash available.");
        return;
      }
      // Validate selections
      const selectedDate = document.getElementById("selected-date").textContent;
      const selectedTimeSlot = document.getElementById("time-slot-select").value;
      const selectedMachine = document.querySelector(".machine-card.selected");
      if (!selectedDate || selectedDate === "Select a date") {
        alert("Please select a date before confirming your booking.");
        return;
      }
      if (!selectedTimeSlot) {
        alert("Please select a time slot before confirming your booking.");
        return;
      }
      if (!selectedMachine) {
        alert("Please select a machine before confirming your booking.");
        return;
      }
      if (isSlotBooked(selectedMachine.dataset.id, selectedDate, selectedTimeSlot)) {
        alert("This slot is already booked for the selected machine.");
        return;
      }
      // Book for free
      const newBooking = {
        id: `b${Date.now()}`,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        machine: {
          id: selectedMachine.dataset.id,
          name: selectedMachine.querySelector(".machine-card-title").textContent,
          type: selectedMachine.querySelector(".icon").innerHTML.includes("rect") ? "washer" : "dryer",
          location: selectedMachine.querySelector(".machine-card-description").textContent,
        },
        status: "upcoming",
        email
      };
      await addBooking(newBooking);
      // Decrement free wash count and broadcast update
      freeWashes[email] = count - 1;
      localStorage.setItem("freeWashes", JSON.stringify(freeWashes));
      localStorage.setItem("freeWashes_update", Date.now());
      updateFreeWashBtn();
      // Switch to My Bookings tab
      document.querySelector('.tab-button[data-tab="mybookings"]').click();
      alert("Free wash booking successful!");
    });
    // Listen for storage changes (in case admin grants while user is on page)
    window.addEventListener("storage", function (e) {
      if (e.key === "freeWashes") updateFreeWashBtn();
    });
  }

  // Free Wash header button logic
  const freeWashHeaderBtn = document.getElementById("free-wash-header-btn");
  async function fetchAndUpdateFreeWashHeaderBtn() {
    const email = localStorage.getItem("email");
    if (!email) return;
    try {
      const res = await fetch(`http://localhost:5000/api/free-wash?email=${encodeURIComponent(email)}&t=${Date.now()}`); // prevent cache
      const data = await res.json();
      const count = data.freeWash || 0;
      freeWashHeaderBtn.textContent = `Free Wash (${count})`;
    } catch {
      freeWashHeaderBtn.textContent = 'Free Wash (0)';
    }
  }
  if (freeWashHeaderBtn) {
    freeWashHeaderBtn.style.display = 'inline-block'; // Always visible
    freeWashHeaderBtn.textContent = 'Free Wash (0)'; // Initial count 0
    fetchAndUpdateFreeWashHeaderBtn();
    setInterval(fetchAndUpdateFreeWashHeaderBtn, 3000); // Poll every 3s for updates
    window.addEventListener("storage", fetchAndUpdateFreeWashHeaderBtn);
    document.querySelector('.tab-button[data-tab="book"]').addEventListener('click', fetchAndUpdateFreeWashHeaderBtn);
    window.addEventListener('focus', fetchAndUpdateFreeWashHeaderBtn);
    freeWashHeaderBtn.addEventListener("click", async function () {
      const email = localStorage.getItem("email");
      if (!email) return;
      // Check count from backend
      const res = await fetch(`http://localhost:5000/api/free-wash?email=${encodeURIComponent(email)}&t=${Date.now()}`);
      const data = await res.json();
      const count = data.freeWash || 0;
      if (count === 0) {
        alert("You do not have a free wash available.");
        return;
      }
      // Validate selections
      const selectedDate = document.getElementById("selected-date").textContent;
      const selectedTimeSlot = document.getElementById("time-slot-select").value;
      const selectedMachine = document.querySelector(".machine-card.selected");
      if (!selectedDate || selectedDate === "Select a date") {
        alert("Please select a date before confirming your booking.");
        return;
      }
      if (!selectedTimeSlot) {
        alert("Please select a time slot before confirming your booking.");
        return;
      }
      if (!selectedMachine) {
        alert("Please select a machine before confirming your booking.");
        return;
      }
      if (isSlotBooked(selectedMachine.dataset.id, selectedDate, selectedTimeSlot)) {
        alert("This slot is already booked for the selected machine.");
        return;
      }
      // Book for free
      const newBooking = {
        id: `b${Date.now()}`,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        machine: {
          id: selectedMachine.dataset.id,
          name: selectedMachine.querySelector(".machine-card-title").textContent,
          type: selectedMachine.querySelector(".icon").innerHTML.includes("rect") ? "washer" : "dryer",
          location: selectedMachine.querySelector(".machine-card-description").textContent,
        },
        status: "upcoming",
        email
      };
      await addBooking(newBooking);
      // Decrement free wash count in backend
      await fetch('http://localhost:5000/api/free-wash/decrement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      fetchAndUpdateFreeWashHeaderBtn();
      document.querySelector('.tab-button[data-tab="mybookings"]').click();
      alert("Free wash booking successful!");
    });
  }

});

function initiatePayment() {
  const selectedDate = document.getElementById("selected-date").textContent;
  const selectedTimeSlot = document.getElementById("time-slot-select").value;
  const selectedMachine = document.querySelector(".machine-card.selected");

  // Validate selections
  if (!selectedDate || selectedDate === "Select a date") {
    alert("Please select a date before confirming your booking.");
    return;
  }

  if (!selectedTimeSlot) {
    alert("Please select a time slot before confirming your booking.");
    return;
  }

  if (!selectedMachine) {
    alert("Please select a machine before confirming your booking.");
    return;
  }

  if (isSlotBooked(selectedMachine.dataset.id, selectedDate, selectedTimeSlot)) {
    alert("This slot is already booked for the selected machine.");
    return;
  }

  const options = {
    key: "rzp_test_DmCYM9dC5cVIgf", // Replace with your Razorpay API key
    amount: 5000, // Amount in paise (e.g., 50000 = ₹500)
    currency: "INR",
    name: "BookMyWash",
    description: "Laundry Slot Booking Payment",
    image: "BMW.png",
    handler: async function (response) {
      alert("Payment successful! Payment ID: " + response.razorpay_payment_id);

      // Get selected details
      const selectedDate = document.getElementById("selected-date").textContent;
      const selectedTimeSlot = document.getElementById("time-slot-select").value;
      const selectedMachine = document.querySelector(".machine-card.selected");
      const email = localStorage.getItem("email"); // <-- Fix: get email from localStorage

      if (selectedDate && selectedTimeSlot && selectedMachine) {
        const newBooking = {
          id: `b${Date.now()}`,
          date: selectedDate,
          timeSlot: selectedTimeSlot,
          machine: {
            id: selectedMachine.dataset.id,
            name: selectedMachine.querySelector(".machine-card-title").textContent,
            type: selectedMachine.querySelector(".icon").innerHTML.includes("rect")
              ? "washer"
              : "dryer",
            location: selectedMachine.querySelector(".machine-card-description").textContent,
          },
          status: "upcoming",
          email // <-- Use the email here
        };

        // Add the new booking
        await addBooking(newBooking);

        // Switch to "My Bookings" tab
        document.querySelector('.tab-button[data-tab="mybookings"]').click();
      } else {
        alert(
          "Please select a date, time slot, and machine before confirming."
        );
      }
    },
    prefill: {
      name: "Username", // Replace with dynamic user data
      email: "username@example.com", // Replace with dynamic user data
    },
    theme: {
      color: "#3399cc",
    },
  };

  const razorpay = new Razorpay(options);
  razorpay.open();

  razorpay.on("payment.failed", function (response) {
    alert("Payment failed! Error: " + response.error.description);
  });
}
