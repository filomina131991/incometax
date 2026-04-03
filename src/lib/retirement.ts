import { addYears, format, isBefore, lastDayOfMonth, subDays, startOfMonth, getMonth, getYear, setMonth, setDate } from 'date-fns';

export function calculateRetirementDate(dob: Date, doj: Date, isTeacher: boolean): Date {
  const cutoffDate = new Date(2013, 3, 1); // April 1, 2013
  const retirementAge = isBefore(doj, cutoffDate) ? 56 : 60;

  // Base retirement date: when they attain the age
  let retirementDate = addYears(dob, retirementAge);

  // Rule 60: If DOB is 1st, retire last day of previous month. Otherwise, last day of same month.
  if (dob.getDate() === 1) {
    retirementDate = lastDayOfMonth(subDays(retirementDate, 1));
  } else {
    retirementDate = lastDayOfMonth(retirementDate);
  }

  // Teacher extension logic: if retiring at 56, continue until March 31st
  if (isTeacher && retirementAge === 56) {
    const month = getMonth(retirementDate); // 0-indexed: 0=Jan, 1=Feb, 2=Mar, 3=Apr, 4=May, 5=Jun...
    const year = getYear(retirementDate);

    // If retirement (attaining 56) is between June (5) and December (11), extend to next March 31st
    if (month >= 5) { 
      retirementDate = new Date(year + 1, 2, 31); // March 31 of next year
    } 
    // If retirement is in Jan (0), Feb (1), or March (2), extend to March 31st of same year
    else if (month <= 2) {
      retirementDate = new Date(year, 2, 31);
    }
    // If retirement is in April (3) or May (4), no extension beyond the month of birth
    // (They retire on the last day of April/May as calculated by the general rule above)
  }

  return retirementDate;
}

export function calculateExperience(doj: Date): string {
  const now = new Date();
  let years = now.getFullYear() - doj.getFullYear();
  let months = now.getMonth() - doj.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return `${years} Years, ${months} Months`;
}
