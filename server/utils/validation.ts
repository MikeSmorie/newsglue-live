/**
 * Utility functions for input validation
 */

/**
 * Validates JSON input data
 * @param inputData - String containing JSON data to validate
 * @returns Parsed data object or null if invalid
 */
export function validateJsonInput(inputData: string): any {
  try {
    const parsedData = JSON.parse(inputData);
    return parsedData;
  } catch (error) {
    console.error("Invalid input data:", error);
    return null; // Return null if input is invalid
  }
}

/**
 * Validates that an object has the required properties
 * @param data - Object to validate
 * @param requiredProps - Array of required property names
 * @returns Boolean indicating if all required properties exist
 */
export function validateRequiredProps(data: any, requiredProps: string[]): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  return requiredProps.every(prop => 
    Object.prototype.hasOwnProperty.call(data, prop) && 
    data[prop] !== undefined && 
    data[prop] !== null
  );
}