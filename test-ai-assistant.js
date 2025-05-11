#!/usr/bin/env node

// Simple test script for AI Assistant validation
console.log("Testing AI Assistant validation...");

// Valid JSON test
const validData = JSON.stringify({
  query: "Test query",
  userId: 123
});

// Invalid JSON test (missing userId)
const invalidData = JSON.stringify({
  query: "Test query"
});

// Test the validation function
function validateInput(inputData) {
  try {
    const parsedData = JSON.parse(inputData);
    if (!parsedData.query || !parsedData.userId) {
      throw new Error("Missing required fields");
    }
    return parsedData;
  } catch (error) {
    console.error("Invalid input data:", error.message);
    return null;
  }
}

// Run tests
console.log("\nValid input test:");
const validResult = validateInput(validData);
console.log("Result:", validResult ? "PASSED ✓" : "FAILED ✗");

console.log("\nInvalid input test:");
const invalidResult = validateInput(invalidData);
console.log("Result:", invalidResult === null ? "PASSED ✓" : "FAILED ✗");

console.log("\nTest complete!");
