
/*
  RFID Library Management System
  ESP8266 + RC522 + 16x2 I2C LCD + Buzzer
  Node.js + MongoDB API

  RC522:
    SDA/SS -> D4
    RST    -> D3
    SCK    -> D5
    MISO   -> D6
    MOSI   -> D7

  LCD:
    SDA    -> D2
    SCL    -> D1

  Buzzer:
    Positive -> D8
    Negative -> GND

  API endpoint:
    http://YOUR_PC_IP:8787/api/device/scan
*/

#include <SPI.h>
#include <MFRC522.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ---------------- PIN CONFIGURATION ----------------

#define RST_PIN D3
#define SS_PIN  D4
#define BUZZER  D8

MFRC522 mfrc522(SS_PIN, RST_PIN);

LiquidCrystal_I2C lcd27(0x27, 16, 2);
LiquidCrystal_I2C lcd3F(0x3F, 16, 2);

LiquidCrystal_I2C* lcd = nullptr;

// ---------------- WIFI CONFIGURATION ----------------

#define WIFI_SSID "Manisha"
#define WIFI_PASSWORD "12345678"

// Use your PC's current LAN IPv4 address.
const char* API_HOST = "192.168.138.192";
const uint16_t API_PORT = 8787;

// Must match DEVICE_API_KEY in your backend .env.
const char* DEVICE_API_KEY =
    "LibraryRFID_Sahil_2026_SecureKey";

// ---------------- STUDENT RFID UIDs ----------------

// Keep these UIDs consistent with your actual student cards.
const char* STUDENT1_UID = "ED5F4D07";
const char* STUDENT1_NAME = "Sahil";

const char* STUDENT2_UID = "E3060630";
const char* STUDENT2_NAME = "Suyash";

const char* STUDENT3_UID = "F9474B07";
const char* STUDENT3_NAME = "Mann";

// ---------------- BOOK RFID UIDs ----------------

// Book 1
const char* BOOK1_UID = "030A63F7";
const char* BOOK1_ID = "B001";
const char* BOOK1_NAME = "Data Science";

// Book 2
const char* BOOK2_UID = "9A7F5E80";
const char* BOOK2_ID = "B002";
const char* BOOK2_NAME = "Internet Of Things";

// Book 3
const char* BOOK3_UID = "5AB29681";
const char* BOOK3_ID = "B003";
const char* BOOK3_NAME = "Operating System";

// ---------------- I2C CHECK ----------------

bool checkI2C(byte address) {
  Wire.beginTransmission(address);
  return Wire.endTransmission() == 0;
}

// ---------------- BUZZER ----------------

void beep(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER, HIGH);
    delay(150);
    digitalWrite(BUZZER, LOW);
    delay(150);
  }
}

// ---------------- LCD DISPLAY ----------------

void showLCD(String line1, String line2) {
  if (lcd == nullptr) {
    return;
  }

  lcd->clear();

  lcd->setCursor(0, 0);
  lcd->print(line1.substring(0, 16));

  lcd->setCursor(0, 1);
  lcd->print(line2.substring(0, 16));
}

void showReadyScreen() {
  showLCD("Library System", "Scan Student");
}

// ---------------- GET RFID UID ----------------

String getUID() {
  String uid = "";

  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      uid += "0";
    }

    uid += String(mfrc522.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();
  return uid;
}

// ---------------- IDENTIFY STUDENT ----------------

String getStudentName(String uid) {
  if (uid == STUDENT1_UID) {
    return STUDENT1_NAME;
  }

  if (uid == STUDENT2_UID) {
    return STUDENT2_NAME;
  }

  if (uid == STUDENT3_UID) {
    return STUDENT3_NAME;
  }

  return "";
}

// ---------------- IDENTIFY BOOK ----------------

String getBookName(String uid) {
  if (uid == BOOK1_UID) {
    return BOOK1_NAME;
  }

  if (uid == BOOK2_UID) {
    return BOOK2_NAME;
  }

  if (uid == BOOK3_UID) {
    return BOOK3_NAME;
  }

  return "";
}

// ---------------- PARSE SIMPLE JSON ----------------

String jsonStringValue(String json, String key) {
  String needle = "\"" + key + "\":\"";

  int start = json.indexOf(needle);

  // Also support JSON containing spaces after the colon.
  if (start < 0) {
    needle = "\"" + key + "\"";
    start = json.indexOf(needle);

    if (start < 0) {
      return "";
    }

    start = json.indexOf(':', start + needle.length());

    if (start < 0) {
      return "";
    }

    start++;

    while (start < json.length() &&
           (json[start] == ' ' ||
            json[start] == '\t' ||
            json[start] == '\n' ||
            json[start] == '\r')) {
      start++;
    }

    if (start >= json.length() || json[start] != '"') {
      return "";
    }

    start++;
  } else {
    start += needle.length();
  }

  int end = json.indexOf('"', start);

  if (end < 0) {
    return "";
  }

  return json.substring(start, end);
}

// ---------------- SEND SCAN TO MONGODB API ----------------

String sendScanToServer(String studentUID, String bookUID) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected");
    return "OFFLINE";
  }

  WiFiClient client;
  HTTPClient http;

  String url = String("http://") +
               API_HOST + ":" +
               String(API_PORT) +
               "/api/device/scan";

  Serial.println();
  Serial.println("Sending RFID scan to server...");
  Serial.print("API URL: ");
  Serial.println(url);

  if (!http.begin(client, url)) {
    Serial.println("HTTP begin failed");
    return "ERROR";
  }

  http.setTimeout(12000);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);

  String body = "{\"studentUID\":\"" +
                studentUID +
                "\",\"bookUID\":\"" +
                bookUID +
                "\"}";

  Serial.print("Request body: ");
  Serial.println(body);

  int code = http.POST(body);
  String response = http.getString();

  Serial.print("HTTP status: ");
  Serial.println(code);

  Serial.print("Server response: ");
  Serial.println(response);

  http.end();

  if (code >= 200 && code < 300) {
    String result = jsonStringValue(response, "result");
    result.trim();
    result.toUpperCase();

    if (result == "ISSUE") {
      return "ISSUE";
    }

    if (result == "RETURN") {
      return "RETURN";
    }

    Serial.println("Unexpected API result");
    return "ERROR";
  }

  if (code < 0) {
    Serial.println("Cannot reach API server");
    return "OFFLINE";
  }

  // For example, HTTP 401 indicates an authentication problem.
  Serial.println("API returned an unsuccessful HTTP status");
  return "ERROR";
}

// ---------------- STOP RFID CARD ----------------

void stopRFID() {
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

// ---------------- WIFI CONNECTION ----------------

void connectWiFi() {
  showLCD("Connecting WiFi", "Please wait");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");

    Serial.print("ESP8266 IP: ");
    Serial.println(WiFi.localIP());

    showLCD("WiFi Connected", "Ready");
  } else {
    Serial.println("WiFi connection failed");
    showLCD("WiFi Failed", "Check settings");
  }

  delay(1500);
}

// ---------------- SETUP ----------------

void setup() {
  Serial.begin(115200);
  delay(800);

  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  // Initialize I2C LCD.
  Wire.begin(D2, D1);
  delay(250);

  if (checkI2C(0x27)) {
    lcd = &lcd27;
    Serial.println("LCD found at 0x27");
  } else if (checkI2C(0x3F)) {
    lcd = &lcd3F;
    Serial.println("LCD found at 0x3F");
  } else {
    Serial.println("LCD not found. Check wiring/address.");
  }

  if (lcd != nullptr) {
    lcd->init();
    lcd->backlight();
  }

  showLCD("Library System", "Starting...");

  // Initialize RC522.
  SPI.begin();
  mfrc522.PCD_Init();

  Serial.println("RC522 initialized");

  // Connect to WiFi.
  connectWiFi();

  showReadyScreen();

  Serial.println();
  Serial.println("RFID Library System Ready");
  Serial.println("Step 1: Scan student card");
  Serial.println("Step 2: Scan any registered book");
}

// ---------------- MAIN LOOP ----------------

void loop() {

  // Step 1: Wait for a student card.
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  String studentUID = getUID();

  Serial.println();
  Serial.print("Scanned student UID: ");
  Serial.println(studentUID);

  String studentName = getStudentName(studentUID);

  // Reject unknown student cards.
  if (studentName == "") {
    showLCD("Unknown Student", "Access Denied");

    Serial.println("Student UID not registered");

    beep(3);
    delay(1600);

    stopRFID();
    showReadyScreen();
    return;
  }

  // Student recognized.
  showLCD("Welcome", studentName);
  beep(1);
  delay(900);

  stopRFID();

  showLCD("Student: " + studentName, "Scan Book");

  Serial.print("Student recognized: ");
  Serial.println(studentName);

  // Step 2: Wait up to 15 seconds for a book card.
  unsigned long startTime = millis();

  while (millis() - startTime < 15000UL) {

    if (!mfrc522.PICC_IsNewCardPresent()) {
      delay(40);
      continue;
    }

    if (!mfrc522.PICC_ReadCardSerial()) {
      continue;
    }

    String bookUID = getUID();

    Serial.print("Scanned book UID: ");
    Serial.println(bookUID);

    // Identify the book using its own UID.
    String bookName = getBookName(bookUID);

    // Reject only if the UID is not one of the three books.
    if (bookName == "") {
      showLCD("Wrong Book", "Try Again");

      Serial.println("Book UID not registered in ESP code");

      beep(3);
      delay(1600);

      stopRFID();
      showReadyScreen();
      return;
    }

    // Registered book recognized.
    Serial.print("Book recognized: ");
    Serial.println(bookName);

    showLCD("Book Found", bookName);

    beep(1);
    delay(600);

    // Send student and book UIDs to the backend.
    String result = sendScanToServer(studentUID, bookUID);

    Serial.print("Final result: ");
    Serial.println(result);

    if (result == "ISSUE") {
      showLCD(bookName, "Book Issued");
      beep(2);
    } else if (result == "RETURN") {
      showLCD(bookName, "Book Returned");
      beep(2);
    } else if (result == "OFFLINE") {
      showLCD("Server Offline", "Check WiFi/IP");
      beep(3);
    } else {
      showLCD("Already Taken", "Check dashboard");
      beep(3);
    }

    delay(2200);

    stopRFID();
    showReadyScreen();

    return;
  }

  // No book scanned within 15 seconds.
  showLCD("Book Not Scanned", "Try Again");

  Serial.println("Book scan timed out");

  delay(1500);
  showReadyScreen();
}
