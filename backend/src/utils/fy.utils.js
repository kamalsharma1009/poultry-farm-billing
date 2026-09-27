/**
 * Returns Indian Financial Year Code for a given date.
 * Financial Year in India starts April 1st and ends March 31st.
 * Example: Date 2026-09-25 -> "2026-27" (01 April 2026 to 31 March 2027)
 * Example: Date 2027-02-15 -> "2026-27"
 */
function getFinancialYearCode(dateInput) {
  const date = new Date(dateInput || Date.now());
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr

  let startYear, endYear;
  if (month >= 3) {
    // April to December
    startYear = year;
    endYear = year + 1;
  } else {
    // January to March
    startYear = year - 1;
    endYear = year;
  }

  const endYearShort = String(endYear).slice(2);
  return `${startYear}-${endYearShort}`;
}

function getFinancialYearDates(yearCode) {
  const [startStr] = yearCode.split('-');
  const startYear = parseInt(startStr, 10);
  const endYear = startYear + 1;

  const startDate = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)); // Apr 1
  const endDate = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59)); // Mar 31

  return { startDate, endDate };
}

async function getOrCreateFinancialYear(prisma, dateInput) {
  const yearCode = getFinancialYearCode(dateInput);
  const { startDate, endDate } = getFinancialYearDates(yearCode);

  let fy = await prisma.financialYear.findUnique({
    where: { yearCode },
  });

  if (!fy) {
    // Ensure only this new year is set as current if it's for current date
    const currentDateCode = getFinancialYearCode(new Date());
    const isCurrent = (yearCode === currentDateCode);

    if (isCurrent) {
      await prisma.financialYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    fy = await prisma.financialYear.create({
      data: {
        yearCode,
        startDate,
        endDate,
        isCurrent,
      },
    });
  }

  return fy;
}

module.exports = {
  getFinancialYearCode,
  getFinancialYearDates,
  getOrCreateFinancialYear,
};
