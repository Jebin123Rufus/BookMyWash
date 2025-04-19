// Booking data
const bookings = [

];

// Create booking card
function createBookingCard(booking) {
  const bookingCard = document.createElement("div");
  bookingCard.classList.add("booking-card");
  bookingCard.dataset.id = booking.id;

  bookingCard.innerHTML = `
    <div class="booking-card-header">
      <div>
        <div class="booking-card-title">${booking.date}</div>
        <div class="booking-card-description">${booking.timeSlot}</div>
      </div>
      ${
        booking.status === "upcoming"
          ? `
        <button class="icon-button booking-menu-button" data-id="${booking.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      `
          : ""
      }
    </div>
    <div class="booking-card-content">
      <div class="machine-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon" style="color: var(--primary);">
          ${
            booking.machine.type === "washer"
              ? '<rect width="18" height="20" x="3" y="2" rx="2"></rect><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>'
              : '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>'
          }
        </svg>
      </div>
      <div class="booking-machine-info">
        <div class="booking-machine-name">${booking.machine.name}</div>
        <div class="booking-machine-location">${booking.machine.location}</div>
      </div>
    </div>
  `;

  // Add cancel booking functionality for upcoming bookings
  if (booking.status === "upcoming") {
    const menuButton = bookingCard.querySelector(".booking-menu-button");
    menuButton.addEventListener("click", () => {
      showCancelModal(booking.id);
    });
  }

  return bookingCard;
}

function generateBookingCards() {
  const upcomingBookingsList = document.getElementById(
    "upcoming-bookings-list"
  );
  const pastBookingsList = document.getElementById("past-bookings-list");

  // Clear existing booking cards
  upcomingBookingsList.innerHTML = "";
  pastBookingsList.innerHTML = "";

  // Filter bookings
  const upcomingBookings = bookings.filter(
    (booking) => booking.status === "upcoming"
  );
  const pastBookings = bookings.filter(
    (booking) => booking.status === "completed"
  );

  // Update tab counts
  document.querySelector(
    '.tab-button[data-bookings-tab="upcoming"]'
  ).textContent = `Upcoming (${upcomingBookings.length})`;
  document.querySelector(
    '.tab-button[data-bookings-tab="past"]'
  ).textContent = `Past (${pastBookings.length})`;

  // Generate upcoming booking cards
  upcomingBookings.forEach((booking) => {
    const bookingCard = createBookingCard(booking);
    upcomingBookingsList.appendChild(bookingCard);
  });

  // Generate past booking cards
  pastBookings.forEach((booking) => {
    const bookingCard = createBookingCard(booking);
    pastBookingsList.appendChild(bookingCard);
  });
}

function addBooking(booking) {
  bookings.push(booking);
  generateBookingCards();
}

document.addEventListener("DOMContentLoaded", () => {
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

  // Bookings tabs
  const bookingsTabButtons = document.querySelectorAll(
    ".tab-button[data-bookings-tab]"
  );
  const bookingsTabContents = document.querySelectorAll(
    ".bookings-tab-content"
  );

  bookingsTabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-bookings-tab");

      // Remove active class from all buttons and contents
      bookingsTabButtons.forEach((btn) => btn.classList.remove("active"));
      bookingsTabContents.forEach((content) =>
        content.classList.remove("active")
      );

      // Add active class to clicked button and corresponding content
      this.classList.add("active");
      document.getElementById(`${tabId}-bookings`).classList.add("active");
    });
  });

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
      status: "booked",
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

    // Generate machine cards
    filteredMachines.forEach((machine) => {
      const machineCard = document.createElement("div");
      machineCard.classList.add("machine-card");
      machineCard.dataset.id = machine.id;

      if (machine.status !== "available") {
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
              machine.status === "available"
                ? "badge-outline"
                : machine.status === "booked"
                ? "badge-secondary"
                : "badge-destructive"
            }">
              ${
                machine.status === "available"
                  ? "Available"
                  : machine.status === "booked"
                  ? "Booked"
                  : "Under Maintenance"
              }
            </div>
          </div>
        `;

      // Add click event for available machines
      if (machine.status === "available") {
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

  // Booking form submission
  const bookingForm = document.getElementById("booking-form");
  const confirmBookingButton = document.getElementById("confirm-booking");

  bookingForm.addEventListener("submit", (event) => {
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

    // Disable button and show loading state
    confirmBookingButton.disabled = true;
    confirmBookingButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        Processing
      `;

    // Simulate API call
    setTimeout(() => {
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
      addBooking({
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
      });
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
  generateBookingCards();

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

  const options = {
    key: "rzp_test_DmCYM9dC5cVIgf", // Replace with your Razorpay API key
    amount: 5000, // Amount in paise (e.g., 50000 = ₹500)
    currency: "INR",
    name: "BookMyWash",
    description: "Laundry Slot Booking Payment",
    image: "BMW.png",
    handler: function (response) {
      alert("Payment successful! Payment ID: " + response.razorpay_payment_id);

      // Get selected details
      const selectedDate = document.getElementById("selected-date").textContent;
      const selectedTimeSlot =
        document.getElementById("time-slot-select").value;
      const selectedMachine = document.querySelector(".machine-card.selected");

      if (selectedDate && selectedTimeSlot && selectedMachine) {
        const newBooking = {
          id: `b${Date.now()}`, // Unique ID
          date: selectedDate,
          timeSlot: selectedTimeSlot,
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
        };

        // Add the new booking
        addBooking(newBooking);

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
