package com.amm1981.horometro

internal fun readingError(value: String, reference: String?, opening: Boolean, tolerance: String = "0"): String? {
    val number = value.replace(',', '.').toBigDecimalOrNull()
        ?: return "Ingresa un horometro numerico valido."
    if (number.signum() < 0) return "El horometro debe ser mayor o igual a 0."
    val previous = reference?.toBigDecimalOrNull()?.takeIf { it > java.math.BigDecimal.ZERO } ?: return null
    if (number < previous) return "No puede ser menor al ultimo horometro valido: $previous."
    val allowed = tolerance.toBigDecimalOrNull()?.max(java.math.BigDecimal.ZERO) ?: java.math.BigDecimal.ZERO
    if (opening && number.subtract(previous).abs() > allowed) {
        return "El inicio debe coincidir con el ultimo horometro valido: $previous. Tolerancia: $allowed."
    }
    return null
}

internal fun closingReadingError(value: String, initial: String?, maxHoursPerDay: String): String? {
    val baseError = readingError(value, initial, opening = false)
    if (baseError != null) return baseError

    val number = value.replace(',', '.').toBigDecimalOrNull() ?: return "Ingresa un horometro numerico valido."
    val initialValue = initial?.toBigDecimalOrNull()?.takeIf { it > java.math.BigDecimal.ZERO } ?: return null
    val maxHours = maxHoursPerDay.toBigDecimalOrNull()?.max(java.math.BigDecimal.ZERO) ?: return null
    val worked = number.subtract(initialValue)

    if (worked > maxHours) {
        return "El cierre supera la tolerancia maxima configurada: $maxHours h."
    }

    return null
}
