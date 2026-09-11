#ifndef TRANSACTION_H
#define TRANSACTION_H

#include <string>
#include <iostream>
#include <iomanip>

/**
 * @brief Represents a single banking transaction in the fraud detection system.
 *
 * Designed with appropriate C++17 types for high performance and low-overhead
 * streaming analysis across graph algorithms, sliding windows, and risk scoring.
 */
struct Transaction {
    std::string transactionId;  // Unique transaction identifier (e.g., "TX1000")
    std::string sender;         // Sender account identifier (e.g., "A101")
    std::string receiver;       // Receiver account identifier (e.g., "A105")
    double amount;              // Monetary amount in INR
    long long timestamp;        // Epoch timestamp in seconds (chronologically ordered)
    std::string deviceId;       // Originating device ID (e.g., "DEV01")
    std::string location;       // Originating city/location (e.g., "Delhi")
    double riskScore;           // Computed fraud risk score [0.0 - 100.0]
    bool isFraud;               // Binary fraud classification flag

    // Default constructor
    Transaction()
        : transactionId(""),
          sender(""),
          receiver(""),
          amount(0.0),
          timestamp(0),
          deviceId(""),
          location(""),
          riskScore(0.0),
          isFraud(false) {}

    // Parameterized constructor
    Transaction(std::string id,
                std::string snd,
                std::string rcv,
                double amt,
                long long ts,
                std::string dev,
                std::string loc,
                double risk = 0.0,
                bool fraud = false)
        : transactionId(std::move(id)),
          sender(std::move(snd)),
          receiver(std::move(rcv)),
          amount(amt),
          timestamp(ts),
          deviceId(std::move(dev)),
          location(std::move(loc)),
          riskScore(risk),
          isFraud(fraud) {}

    /**
     * @brief Formats the transaction as a human-readable single-line summary.
     * Example: TX1000 | A101 -> A105 | ₹4500 | 1700000010 | DEV02 | Delhi
     */
    void print() const {
        std::cout << transactionId << " | "
                  << sender << " -> " << receiver << " | "
                  << "₹" << std::fixed << std::setprecision(0) << amount << " | "
                  << timestamp << " | "
                  << deviceId << " | "
                  << location << std::endl;
    }
};

#endif // TRANSACTION_H
