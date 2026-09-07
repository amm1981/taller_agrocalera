package com.amm1981.horometro

import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class HourmeterValidationTest {
    @Test fun firstReferenceAcceptsZeroAndPositiveReadings() {
        assertNull(readingError("0", null, true))
        assertNull(readingError("1258,7", null, true))
    }

    @Test fun rejectsInvalidOrNegativeReadings() {
        listOf("", "abc", "NaN", "Infinity", "-1").forEach {
            assertNotNull(readingError(it, null, true))
        }
    }

    @Test fun openingRequiresExactReferenceByDefault() {
        assertNull(readingError("100.00", "100", true))
        assertNotNull(readingError("99.99", "100", true))
        assertNotNull(readingError("100.01", "100", true))
    }

    @Test fun toleranceNeverPermitsGoingBackwards() {
        assertNull(readingError("100.5", "100", true, "0.5"))
        assertNotNull(readingError("99.5", "100", true, "0.5"))
        assertNotNull(readingError("100.51", "100", true, "0.5"))
    }

    @Test fun closingAcceptsSameOrHigherReading() {
        assertNull(readingError("100", "100", false))
        assertNull(readingError("110", "100", false))
        assertNotNull(readingError("99.99", "100", false))
    }
}
