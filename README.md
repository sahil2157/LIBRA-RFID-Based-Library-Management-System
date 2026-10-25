# 📚 RFID Library Management System

An IoT-based Library Management System that automates book issuing and returning using RFID technology, an ESP8266 NodeMCU, and a web-based dashboard powered by Node.js, Express.js, and MongoDB.

The system identifies students and books using RFID cards, records transactions in MongoDB, and provides visual analytics to monitor library usage.

## ✨ Features

### 🔐 RFID-Based Library Operations
- Scan student RFID cards to identify registered students.
- Scan book RFID tags to issue or return books.
- Automatically determine whether a book should be issued or returned based on its current status.
- Display operation status on a 16×2 I2C LCD.
- Use buzzer alerts for successful scans and errors.

### 👨‍🎓 Student Management
- Register students with mandatory details:
  - Full name
  - RFID UID
  - Moodle ID
  - Department
  - College email (`@apsit.edu.in`)
  - Division
- Validate student email addresses.
- Maintain individual student records and borrowing history.

### 📊 Dashboard and Analytics
- View library activity through a modern web dashboard.
- Track total book issues and returns.
- View individual student borrowing statistics.
- Monitor currently borrowed books and their return status.
- Display department-wise book usage graphs.
- Display division-wise book usage graphs.
- Compare book borrowing activity across departments and divisions.
- View transaction history and frequently borrowed books.
- Support responsive layouts and light/dark themes, where configured.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Microcontroller | ESP8266 NodeMCU |
| RFID Reader | MFRC522 RC522 |
| Display | 16×2 I2C LCD |
| Programming | Arduino C++ |
| Frontend | React.js |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Charts | Recharts |
| Communication | HTTP over local Wi-Fi |
| Version Control | Git and GitHub |

## 🔌 Hardware Requirements

- ESP8266 NodeMCU
- MFRC522 RFID reader
- RFID cards/tags for students and books
- 16×2 LCD with I2C module
- Buzzer
- Breadboard and jumper wires
- USB cable and power supply
- Computer running the Node.js backend

## 🔗 Circuit Connections

### MFRC522 RFID Reader

| RC522 Pin | ESP8266 Pin |
|---|---|
| SDA / SS | D4 |
| RST | D3 |
| SCK | D5 |
| MISO | D6 |
| MOSI | D7 |
| GND | GND |
| 3.3V | 3V3 |

### I2C LCD

| LCD Pin | ESP8266 Pin |
|---|---|
| SDA | D2 |
| SCL | D1 |
| GND | GND |
| VCC | According to the LCD module's electrical requirements |

### Buzzer

| Buzzer Pin | ESP8266 Pin |
|---|---|
| Positive | D8 |
| Negative | GND |

**Important:** The RC522 operates at 3.3V. Check your LCD module's voltage requirements and ensure its I2C signal levels are safe for the ESP8266.

## ⚙️ How It Works

1. The ESP8266 connects to the configured Wi-Fi network.
2. The student scans their RFID card.
3. The system verifies the student's registered UID.
4. The student scans a registered book's RFID tag.
5. The ESP8266 sends the student UID and book UID to the backend API.
6. The backend validates the request and processes the issue or return transaction.
7. MongoDB stores the updated borrowing status and transaction history.
8. The LCD and buzzer provide feedback.
9. The dashboard displays updated records and analytics.

## 🚀 Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/rfid-library-dashboard.git
cd rfid-library-dashboard
```

Replace `YOUR_USERNAME` with your GitHub username and adjust the repository name if necessary.

### 2. Install Dependencies

Install the project dependencies:

```bash
npm install
```

If the frontend and backend use separate `package.json` files, install dependencies in their respective directories as well.

### 3. Configure Environment Variables

Create a `.env` file in the backend directory, following the variable names expected by your server code.

Example:

```env
PORT=8787
MONGODB_URI=your_mongodb_connection_string
DEVICE_API_KEY=your_secure_device_api_key
```

Use your actual environment variable names if they differ from this example.

**Security:** Never commit `.env` files, MongoDB credentials, API keys, or Wi-Fi passwords to GitHub.

### 4. Start the Backend

From the project root, run the backend command configured in your `package.json`, for example:

```bash
npm run server
```

The backend should listen on port `8787` if that is the port configured in your application.

### 5. Start the Frontend

Open another terminal:

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal.

### 6. Configure the ESP8266

Open the Arduino sketch in Arduino IDE and configure:

```cpp
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

const char* API_HOST = "YOUR_PC_LAN_IP";
const uint16_t API_PORT = 8787;

const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY";
```

Use the computer's current LAN IPv4 address, not `localhost` or `127.0.0.1`.

Make sure the computer and ESP8266 are connected to the same Wi-Fi network and that the backend port is accessible from the ESP8266.

Install the required Arduino libraries:

- MFRC522
- ESP8266 board support package
- LiquidCrystal_I2C

The ESP8266 core supplies the Wi-Fi, HTTP client, SPI, and Wire libraries.

Compile and upload the sketch to the NodeMCU.

## 📈 Analytics

The dashboard can provide insights into library usage through:

- **Student analytics:** Issue and return counts, current loans, and individual transaction history.
- **Department analytics:** Compare borrowing activity across academic departments.
- **Division analytics:** Identify divisions with higher borrowing activity.
- **Book analytics:** Identify frequently borrowed books.
- **Transaction analytics:** Review issue and return events.

Department and division graphs depend on registered student details and correctly linked MongoDB transaction records.

## 🔐 Security Considerations

- Keep database credentials and API keys in environment variables.
- Exclude `.env` from version control.
- Use strong device authentication.
- Restrict access to administrative dashboard routes.
- Validate registration fields and email addresses on the backend.
- Do not expose the unauthenticated device API directly to the public internet.
- Use HTTPS and appropriate authentication before deploying outside a trusted local network.
- Never publish real student information, RFID UIDs, or credentials in screenshots or example database records.

## 🗂️ Suggested Project Structure

```text
rfid-library-dashboard/
├── server/
│   ├── index.js
│   ├── models.js
│   └── .env                 
├── src/
│   ├── App.jsx
│   ├── api.js
│   ├── styles.css
│   └── main.jsx
├── public/
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
└── firmware/
    └── rfid_library.ino
```

Adjust the structure to match your actual repository.

## 🧪 Testing Checklist

- [ ] ESP8266 connects to Wi-Fi.
- [ ] Registered student RFID cards are recognized.
- [ ] Unknown student cards are rejected.
- [ ] All registered book RFID UIDs are recognized.
- [ ] Book issue and return operations update MongoDB correctly.
- [ ] Student registration requires all mandatory fields.
- [ ] Only valid `@apsit.edu.in` email addresses are accepted.
- [ ] Individual student analytics display correctly.
- [ ] Department-wise usage graphs display correctly.
- [ ] Division-wise usage graphs display correctly.
- [ ] Dashboard updates after new transactions.
- [ ] Invalid API keys and server disconnections are handled.

## 🔮 Future Enhancements

- QR-code support for books and students.
- Email notifications for overdue books.
- Book reservation and availability tracking.
- Exportable borrowing reports.
- Advanced analytics with date-range filters.
- Automated overdue reminders.
- Cloud deployment with secure device communication.

## 👨‍💻 Contributors

Add the names of the project contributors here.

## 📄 License

This project is available for educational and learning purposes. Add a license file if you intend to publish it under a specific open-source license.

---

**Built with IoT, React, Node.js, Express, and MongoDB to make library management smarter and more efficient.**
