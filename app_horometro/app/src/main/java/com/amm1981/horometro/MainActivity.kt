package com.amm1981.horometro

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview as CameraPreview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Construction
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Agriculture
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Speed
import com.amm1981.horometro.ui.theme.HorometroTheme
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.io.BufferedReader
import java.io.File
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

private const val DEFAULT_API_URL = "https://taller.agrocalera.app/api"
private val DEFAULT_RESPONSIBLE_USER = BuildConfig.HOROMETRO_SYNC_USER
private val DEFAULT_RESPONSIBLE_PASSWORD = BuildConfig.HOROMETRO_SYNC_PASSWORD
private val AppBackground = Color(0xFFF6F8F7)
private val AppGreen = Color(0xFF087A3D)
private val AppGreenDark = Color(0xFF064E3B)
private val AppHeaderGreen = Color(0xFF14502D)
private val AppGreenSoft = Color(0xFFE8F5EA)
private val AppText = Color(0xFF0F172A)
private val AppMuted = Color(0xFF64748B)
private val AppLine = Color(0xFFE2E8F0)

enum class RegistrationType(
    val title: String,
    val subtitle: String,
) {
    TRACTORS("Tractores", "Registro directo"),
    HEAVY("Maquinaria pesada", "Requiere login del responsable"),
}

data class Vehicle(
    val id: Int,
    val code: String,
    val name: String,
    val typeName: String,
    val fundoId: Int?,
    val sectorId: Int?,
    val loteId: Int?,
    val sedeName: String?,
    val loteName: String?,
    val sedeId: Int? = null,
    val lastValid: String? = null,
    val referenceSynced: Boolean = false,
)

data class LocationOption(
    val id: Int,
    val code: String,
    val name: String,
    val parentId: Int? = null,
)

data class Operator(
    val id: Int,
    val dni: String,
    val fullName: String,
    val type: String,
)

data class HourmeterRecord(
    val id: Int,
    val date: String,
    val state: String,
    val vehicle: Vehicle?,
    val operator: Operator?,
    val initial: String?,
    val final: String?,
    val hours: String?,
)

data class HourmeterConfig(
    val startFrom: String,
    val startTo: String,
    val closeUntil: String,
    val startToleranceHours: String,
    val maxHoursPerDay: String,
    val allowManualCorrection: Boolean,
    val requirePhoto: Boolean,
    val reopeningMinutes: Int,
    val ocrEnabled: Boolean,
) {
    companion object {
        val DEFAULT = HourmeterConfig(
            startFrom = "07:00:00",
            startTo = "08:00:00",
            closeUntil = "19:30:00",
            startToleranceHours = "0.00",
            maxHoursPerDay = "24.00",
            allowManualCorrection = true,
            requirePhoto = true,
            reopeningMinutes = 120,
            ocrEnabled = true,
        )
    }
}

data class AppSession(
    val token: String,
    val userName: String,
    val role: String,
)

data class HourmeterCaptureDraft(
    val vehicleId: Int,
    val operatorId: Int?,
    val vehicleLabel: String,
    val operatorLabel: String?,
    val photoPath: String,
    val detectedValue: String,
    val confirmedValue: String,
    val dateTime: String,
)

data class FieldData(
    val vehicles: List<Vehicle>,
    val operators: List<Operator>,
    val pending: List<HourmeterRecord>,
    val fundos: List<LocationOption>,
    val sectores: List<LocationOption>,
    val lotes: List<LocationOption>,
    val config: HourmeterConfig,
) {
    companion object {
        val EMPTY = FieldData(
            vehicles = emptyList(),
            operators = emptyList(),
            pending = emptyList(),
            fundos = emptyList(),
            sectores = emptyList(),
            lotes = emptyList(),
            config = HourmeterConfig.DEFAULT,
        )
    }
}

data class LocalHourmeterRecord(
    val localId: String,
    val serverId: Int?,
    val vehicleId: Int,
    val vehicleLabel: String,
    val operatorId: Int?,
    val operatorLabel: String?,
    val fundoId: Int?,
    val sectorId: Int?,
    val loteId: Int?,
    val initialConfirmed: String,
    val initialOcr: String?,
    val initialPhotoPath: String?,
    val startDateTime: String,
    val manualCorrectionStart: Boolean,
    val finalConfirmed: String?,
    val finalOcr: String?,
    val finalPhotoPath: String?,
    val finalDateTime: String?,
    val status: String,
)

data class CachedFieldData(
    val data: FieldData,
    val syncedAt: String,
)

class AgroControlApi(private val baseUrl: String) {
    suspend fun login(usuario: String, password: String): AppSession = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("usuario", usuario)
            .put("password", password)
            .put("device_name", "android-horometro")

        val json = request("POST", "/auth/login", payload = payload)
        val user = json.getJSONObject("user")
        val roles = json.optJSONArray("roles") ?: JSONArray()

        AppSession(
            token = json.getString("token"),
            userName = user.optString("name", "Usuario"),
            role = roles.optString(0, "OPERACION"),
        )
    }

    suspend fun vehicles(token: String): List<Vehicle> = withContext(Dispatchers.IO) {
        val items = requestAll("/vehiculos?activo=true", token = token)

        items.mapJsonObjects { item ->
            val type = item.optJSONObject("tipo_vehiculo")
            Vehicle(
                id = item.getInt("id"),
                code = item.optString("codigo"),
                name = item.optString("nombre", item.optString("codigo")),
                typeName = type?.optString("nombre") ?: "Equipo",
                fundoId = item.nullableInt("fundo_id"),
                sectorId = item.nullableInt("sector_id"),
                loteId = item.nullableInt("lote_id"),
                sedeName = item.optJSONObject("sede")?.optString("nombre"),
                loteName = item.optJSONObject("lote")?.optString("nombre"),
                sedeId = item.nullableInt("sede_id"),
                lastValid = item.nullableString("ultimo_horometro_valido"),
                referenceSynced = item.has("ultimo_horometro_valido"),
            )
        }
    }

    suspend fun fundos(token: String): List<LocationOption> = withContext(Dispatchers.IO) {
        val items = requestAll("/fundos?estado=ACTIVO", token = token)

        items.mapJsonObjects { item ->
            LocationOption(
                id = item.getInt("id"),
                code = item.optString("codigo"),
                name = item.optString("nombre"),
                parentId = item.nullableInt("sede_id"),
            )
        }
    }

    suspend fun lotes(token: String): List<LocationOption> = withContext(Dispatchers.IO) {
        val items = requestAll("/lotes?estado=ACTIVO", token = token)

        items.mapJsonObjects { item ->
            LocationOption(
                id = item.getInt("id"),
                code = item.optString("codigo"),
                name = item.optString("nombre"),
                parentId = item.nullableInt("sector_id"),
            )
        }
    }

    suspend fun sectores(token: String): List<LocationOption> = withContext(Dispatchers.IO) {
        val items = requestAll("/sectores?estado=ACTIVO", token = token)

        items.mapJsonObjects { item ->
            LocationOption(
                id = item.getInt("id"),
                code = item.optString("codigo"),
                name = item.optString("nombre"),
                parentId = item.nullableInt("fundo_id"),
            )
        }
    }

    suspend fun operators(token: String): List<Operator> = withContext(Dispatchers.IO) {
        val items = requestAll("/personal?estado=ACTIVO", token = token)

        items.mapJsonObjects { item ->
            Operator(
                id = item.getInt("id"),
                dni = item.optString("dni"),
                fullName = "${item.optString("nombres")} ${item.optString("apellidos")}".trim(),
                type = item.optString("tipo"),
            )
        }.filter { it.type == "OPERARIO" || it.type == "CONDUCTOR" || it.type == "TRACTORISTA" || it.type == "MAQUINISTA" }
    }

    suspend fun pendingRecords(token: String): List<HourmeterRecord> = withContext(Dispatchers.IO) {
        requestAll("/horometros/pendientes", token).mapJsonObjects(::recordFromJson)
    }

    suspend fun configuration(token: String): HourmeterConfig = withContext(Dispatchers.IO) {
        configFromJson(request("GET", "/horometros/configuracion", token = token).getJSONObject("data"))
    }

    suspend fun fieldData(token: String, onProgress: (Int) -> Unit = {}): FieldData {
        onProgress(10)
        val newVehicles = vehicles(token)
        onProgress(25)
        val newOperators = operators(token)
        onProgress(40)
        val newPending = pendingRecords(token)
        onProgress(55)
        val newFundos = emptyList<LocationOption>()
        onProgress(70)
        val newSectores = emptyList<LocationOption>()
        onProgress(82)
        val newLotes = emptyList<LocationOption>()
        onProgress(94)
        val newConfig = configuration(token)
        onProgress(100)

        return FieldData(newVehicles, newOperators, newPending, newFundos, newSectores, newLotes, newConfig)
    }

    suspend fun submitLocalRecord(token: String, local: LocalHourmeterRecord, onStartSaved: (Int) -> Unit = {}): LocalHourmeterRecord {
        val startRecord = if (local.serverId == null) {
            registerStart(
                token = token,
                vehicleId = local.vehicleId,
                clientReference = local.localId,
                operatorId = local.operatorId,
                fundoId = local.fundoId,
                sectorId = local.sectorId,
                loteId = local.loteId,
                confirmed = local.initialConfirmed,
                ocr = local.initialOcr,
                manualCorrection = local.manualCorrectionStart,
                dateTime = local.startDateTime,
                photoReference = local.initialPhotoPath?.let { photoReference("inicio", local.vehicleId) },
                photoPath = local.initialPhotoPath,
            )
        } else {
            HourmeterRecord(
                id = local.serverId,
                date = local.startDateTime.substringBefore("T"),
                state = local.status,
                vehicle = null,
                operator = null,
                initial = local.initialConfirmed,
                final = local.finalConfirmed,
                hours = null,
            )
        }

        onStartSaved(startRecord.id)
        if (!local.finalConfirmed.isNullOrBlank()) {
            val closed = registerClose(
                token = token,
                recordId = startRecord.id,
                confirmed = local.finalConfirmed,
                ocr = local.finalOcr,
                dateTime = local.finalDateTime ?: currentDateTime(),
                photoReference = local.finalPhotoPath?.let { photoReference("cierre", startRecord.id) },
                photoPath = local.finalPhotoPath,
            )

            return local.copy(serverId = closed.id, status = "CERRADO")
        }

        return local.copy(serverId = startRecord.id, status = "PENDIENTE_CIERRE")
    }

    suspend fun registerStart(
        token: String,
        vehicleId: Int,
        clientReference: String? = null,
        operatorId: Int?,
        fundoId: Int?,
        sectorId: Int?,
        loteId: Int?,
        confirmed: String,
        ocr: String?,
        manualCorrection: Boolean,
        dateTime: String,
        photoReference: String?,
        photoPath: String?,
    ): HourmeterRecord = withContext(Dispatchers.IO) {
        require(token.isNotBlank()) { "Sin sesion activa. Sincroniza datos cuando tengas conexion e intenta nuevamente." }

        val payload = JSONObject()
            .put("vehiculo_id", vehicleId)
            .putNullable("client_reference", clientReference)
            .put("fecha", dateTime.substringBefore("T"))
            .put("horometro_inicial_confirmado", confirmed)
            .put("fecha_hora_inicio", dateTime)
            .put("correccion_manual_inicio", manualCorrection)

        if (!photoReference.isNullOrBlank()) {
            payload.put("foto_inicial", photoReference)
        }

        if (operatorId != null) {
            payload.put("operario_id", operatorId)
        }

        if (fundoId != null) {
            payload.put("fundo_id", fundoId)
        }

        if (sectorId != null) {
            payload.put("sector_id", sectorId)
        }

        if (loteId != null) {
            payload.put("lote_id", loteId)
        }

        if (!ocr.isNullOrBlank()) {
            payload.put("horometro_inicial_ocr", ocr)
        }

        if (!photoPath.isNullOrBlank()) {
            payload.put("foto_inicial_base64", encodeFileAsBase64(photoPath))
        }

        recordFromJson(request("POST", "/horometros/inicio", token = token, payload = payload).getJSONObject("data"))
    }

    suspend fun registerClose(
        token: String,
        recordId: Int,
        confirmed: String,
        ocr: String?,
        dateTime: String,
        photoReference: String?,
        photoPath: String? = null,
    ): HourmeterRecord = withContext(Dispatchers.IO) {
        require(token.isNotBlank()) { "Sin sesion activa. Sincroniza datos cuando tengas conexion e intenta nuevamente." }

        val payload = JSONObject()
            .put("horometro_final_confirmado", confirmed)
            .put("fecha_hora_final", dateTime)
            .put("correccion_manual_final", !ocr.isNullOrBlank())

        if (!photoReference.isNullOrBlank()) {
            payload.put("foto_final", photoReference)
        }

        if (!ocr.isNullOrBlank()) {
            payload.put("horometro_final_ocr", ocr)
        }

        if (!photoPath.isNullOrBlank()) {
            payload.put("foto_final_base64", encodeFileAsBase64(photoPath))
        }

        recordFromJson(request("POST", "/horometros/$recordId/cierre", token = token, payload = payload).getJSONObject("data"))
    }

    private fun request(
        method: String,
        path: String,
        token: String? = null,
        payload: JSONObject? = null,
    ): JSONObject {
        val connection = (URL("$baseUrl$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 30_000
            readTimeout = 60_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")

            if (token != null) {
                setRequestProperty("Authorization", "Bearer $token")
            }

            if (payload != null) {
                doOutput = true
                OutputStreamWriter(outputStream).use { writer ->
                    writer.write(payload.toString())
                }
            }
        }

        val status = connection.responseCode
        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
        val body = stream.bufferedReader().use(BufferedReader::readText)

        if (status !in 200..299) {
            val message = runCatching {
                val json = JSONObject(body)
                val errors = json.optJSONObject("errors")
                errors?.keys()?.asSequence()?.firstOrNull()?.let { key ->
                    errors.optJSONArray(key)?.optString(0)
                } ?: json.optString("message")
            }.getOrNull()

            throw IllegalStateException(message?.ifBlank { null } ?: "Error HTTP $status")
        }

        return JSONObject(body)
    }

    private fun requestAll(path: String, token: String): JSONArray {
        val merged = JSONArray()
        var page = 1

        while (true) {
            val separator = if (path.contains("?")) "&" else "?"
            val json = request("GET", "$path${separator}per_page=100&page=$page", token = token)
            val data = json.getJSONArray("data")

            for (index in 0 until data.length()) {
                merged.put(data.getJSONObject(index))
            }

            val meta = json.optJSONObject("meta")
            val lastPage = meta?.optInt("last_page", page) ?: page

            if (page >= lastPage) {
                break
            }

            page++
        }

        return merged
    }
}

private fun recordFromJson(item: JSONObject): HourmeterRecord {
    val vehicleJson = item.optJSONObject("vehiculo")
    val operatorJson = item.optJSONObject("operario")

    return HourmeterRecord(
        id = item.getInt("id"),
        date = item.optString("fecha"),
        state = item.optString("estado"),
        vehicle = vehicleJson?.let { vehicle ->
            val type = vehicle.optJSONObject("tipo_vehiculo")
            Vehicle(
                id = vehicle.optInt("id"),
                code = vehicle.optString("codigo"),
                name = vehicle.optString("nombre", vehicle.optString("codigo")),
                typeName = type?.optString("nombre") ?: "Equipo",
                fundoId = vehicle.nullableInt("fundo_id"),
                sectorId = vehicle.nullableInt("sector_id"),
                loteId = vehicle.nullableInt("lote_id"),
                sedeName = vehicle.optJSONObject("sede")?.optString("nombre"),
                loteName = vehicle.optJSONObject("lote")?.optString("nombre"),
            )
        },
        operator = operatorJson?.let { operator ->
            Operator(
                id = operator.optInt("id"),
                dni = operator.optString("dni"),
                fullName = "${operator.optString("nombres")} ${operator.optString("apellidos")}".trim(),
                type = operator.optString("tipo"),
            )
        },
        initial = item.nullableString("horometro_inicial_confirmado"),
        final = item.nullableString("horometro_final_confirmado"),
        hours = item.nullableString("horas_trabajadas"),
    )
}

private fun configFromJson(item: JSONObject): HourmeterConfig {
    return HourmeterConfig(
        startFrom = item.optString("hora_inicio_desde", HourmeterConfig.DEFAULT.startFrom),
        startTo = item.optString("hora_inicio_hasta", HourmeterConfig.DEFAULT.startTo),
        closeUntil = item.optString("hora_cierre_hasta", HourmeterConfig.DEFAULT.closeUntil),
        startToleranceHours = item.optString("tolerancia_inicio_horas", HourmeterConfig.DEFAULT.startToleranceHours),
        maxHoursPerDay = item.optString("tolerancia_maxima_horas_dia", HourmeterConfig.DEFAULT.maxHoursPerDay),
        allowManualCorrection = item.optBoolean("permite_correccion_manual", true),
        requirePhoto = item.optBoolean("foto_obligatoria", true),
        reopeningMinutes = item.optInt("vigencia_reapertura_minutos", 120),
        ocrEnabled = item.optBoolean("ocr_activo", true),
    )
}

private fun <T> JSONArray.mapJsonObjects(transform: (JSONObject) -> T): List<T> {
    return (0 until length()).map { index -> transform(getJSONObject(index)) }
}

private const val FIELD_DATA_CACHE_FILE = "horometro_field_data_cache.json"
private const val LOCAL_RECORDS_CACHE_FILE = "horometro_local_records.json"

private fun saveFieldDataCache(context: Context, cached: CachedFieldData) {
    runCatching {
        File(context.filesDir, FIELD_DATA_CACHE_FILE).writeText(cached.toJson().toString())
    }
}

private fun loadFieldDataCache(context: Context): CachedFieldData? {
    return runCatching {
        val file = File(context.filesDir, FIELD_DATA_CACHE_FILE)
        if (!file.exists()) {
            return null
        }

        cachedFieldDataFromJson(JSONObject(file.readText()))
    }.getOrNull()
}

private fun CachedFieldData.toJson(): JSONObject {
    return JSONObject()
        .put("synced_at", syncedAt)
        .put("vehicles", JSONArray().also { array -> data.vehicles.forEach { array.put(it.toJson()) } })
        .put("operators", JSONArray().also { array -> data.operators.forEach { array.put(it.toJson()) } })
        .put("pending", JSONArray().also { array -> data.pending.forEach { array.put(it.toJson()) } })
        .put("fundos", JSONArray().also { array -> data.fundos.forEach { array.put(it.toJson()) } })
        .put("sectores", JSONArray().also { array -> data.sectores.forEach { array.put(it.toJson()) } })
        .put("lotes", JSONArray().also { array -> data.lotes.forEach { array.put(it.toJson()) } })
        .put("config", data.config.toJson())
}

private fun cachedFieldDataFromJson(json: JSONObject): CachedFieldData {
    return CachedFieldData(
        syncedAt = json.optString("synced_at"),
        data = FieldData(
            vehicles = json.optJSONArray("vehicles").orEmptyArray().mapJsonObjects(::vehicleFromCacheJson),
            operators = json.optJSONArray("operators").orEmptyArray().mapJsonObjects(::operatorFromCacheJson),
            pending = json.optJSONArray("pending").orEmptyArray().mapJsonObjects(::recordFromCacheJson),
            fundos = json.optJSONArray("fundos").orEmptyArray().mapJsonObjects(::locationFromCacheJson),
            sectores = json.optJSONArray("sectores").orEmptyArray().mapJsonObjects(::locationFromCacheJson),
            lotes = json.optJSONArray("lotes").orEmptyArray().mapJsonObjects(::locationFromCacheJson),
            config = json.optJSONObject("config")?.let(::configFromCacheJson) ?: HourmeterConfig.DEFAULT,
        ),
    )
}

private fun saveLocalRecords(context: Context, records: List<LocalHourmeterRecord>) {
    val payload = JSONArray().also { array -> records.forEach { array.put(it.toJson()) } }
    val file = android.util.AtomicFile(File(context.filesDir, LOCAL_RECORDS_CACHE_FILE))
    val stream = file.startWrite()
    try {
        stream.write(payload.toString().toByteArray(Charsets.UTF_8))
        file.finishWrite(stream)
    } catch (error: Exception) {
        file.failWrite(stream)
        throw error
    }
}

private fun loadLocalRecords(context: Context): List<LocalHourmeterRecord> {
    return runCatching {
        val file = File(context.filesDir, LOCAL_RECORDS_CACHE_FILE)
        if (!file.exists()) {
            return emptyList()
        }

        JSONArray(file.readText()).mapJsonObjects(::localRecordFromJson)
    }.getOrDefault(emptyList())
}

private fun JSONArray?.orEmptyArray(): JSONArray = this ?: JSONArray()

private fun Vehicle.toJson(): JSONObject {
    return JSONObject()
        .put("id", id)
        .put("code", code)
        .put("name", name)
        .put("type_name", typeName)
        .putNullable("sede_id", sedeId)
        .putNullable("last_valid", lastValid)
        .put("reference_synced", referenceSynced)
        .putNullable("fundo_id", fundoId)
        .putNullable("sector_id", sectorId)
        .putNullable("lote_id", loteId)
        .putNullable("sede_name", sedeName)
        .putNullable("lote_name", loteName)
}

private fun vehicleFromCacheJson(json: JSONObject): Vehicle {
    return Vehicle(
        id = json.getInt("id"),
        code = json.optString("code"),
        name = json.optString("name"),
        typeName = json.optString("type_name"),
        sedeId = json.nullableInt("sede_id"),
        lastValid = json.nullableString("last_valid"),
        referenceSynced = json.optBoolean("reference_synced", false),
        fundoId = json.nullableInt("fundo_id"),
        sectorId = json.nullableInt("sector_id"),
        loteId = json.nullableInt("lote_id"),
        sedeName = json.nullableString("sede_name"),
        loteName = json.nullableString("lote_name"),
    )
}

private fun Operator.toJson(): JSONObject {
    return JSONObject()
        .put("id", id)
        .put("dni", dni)
        .put("full_name", fullName)
        .put("type", type)
}

private fun operatorFromCacheJson(json: JSONObject): Operator {
    return Operator(
        id = json.getInt("id"),
        dni = json.optString("dni"),
        fullName = json.optString("full_name"),
        type = json.optString("type"),
    )
}

private fun LocationOption.toJson(): JSONObject {
    return JSONObject()
        .put("id", id)
        .put("code", code)
        .put("name", name)
        .putNullable("parent_id", parentId)
}

private fun locationFromCacheJson(json: JSONObject): LocationOption {
    return LocationOption(
        id = json.getInt("id"),
        code = json.optString("code"),
        name = json.optString("name"),
        parentId = json.nullableInt("parent_id"),
    )
}

private fun HourmeterRecord.toJson(): JSONObject {
    return JSONObject()
        .put("id", id)
        .put("date", date)
        .put("state", state)
        .putNullable("initial", initial)
        .putNullable("final", final)
        .putNullable("hours", hours)
        .putNullable("vehicle", vehicle?.toJson())
        .putNullable("operator", operator?.toJson())
}

private fun recordFromCacheJson(json: JSONObject): HourmeterRecord {
    return HourmeterRecord(
        id = json.getInt("id"),
        date = json.optString("date"),
        state = json.optString("state"),
        vehicle = json.optJSONObject("vehicle")?.let(::vehicleFromCacheJson),
        operator = json.optJSONObject("operator")?.let(::operatorFromCacheJson),
        initial = json.nullableString("initial"),
        final = json.nullableString("final"),
        hours = json.nullableString("hours"),
    )
}

private fun HourmeterConfig.toJson(): JSONObject {
    return JSONObject()
        .put("start_from", startFrom)
        .put("start_to", startTo)
        .put("close_until", closeUntil)
        .put("start_tolerance_hours", startToleranceHours)
        .put("max_hours_per_day", maxHoursPerDay)
        .put("allow_manual_correction", allowManualCorrection)
        .put("require_photo", requirePhoto)
        .put("reopening_minutes", reopeningMinutes)
        .put("ocr_enabled", ocrEnabled)
}

private fun configFromCacheJson(json: JSONObject): HourmeterConfig {
    return HourmeterConfig(
        startFrom = json.optString("start_from", HourmeterConfig.DEFAULT.startFrom),
        startTo = json.optString("start_to", HourmeterConfig.DEFAULT.startTo),
        closeUntil = json.optString("close_until", HourmeterConfig.DEFAULT.closeUntil),
        startToleranceHours = json.optString("start_tolerance_hours", HourmeterConfig.DEFAULT.startToleranceHours),
        maxHoursPerDay = json.optString("max_hours_per_day", HourmeterConfig.DEFAULT.maxHoursPerDay),
        allowManualCorrection = json.optBoolean("allow_manual_correction", true),
        requirePhoto = json.optBoolean("require_photo", true),
        reopeningMinutes = json.optInt("reopening_minutes", 120),
        ocrEnabled = json.optBoolean("ocr_enabled", true),
    )
}

private fun LocalHourmeterRecord.toJson(): JSONObject {
    return JSONObject()
        .put("local_id", localId)
        .putNullable("server_id", serverId)
        .put("vehicle_id", vehicleId)
        .put("vehicle_label", vehicleLabel)
        .putNullable("operator_id", operatorId)
        .putNullable("operator_label", operatorLabel)
        .putNullable("fundo_id", fundoId)
        .putNullable("sector_id", sectorId)
        .putNullable("lote_id", loteId)
        .put("initial_confirmed", initialConfirmed)
        .putNullable("initial_ocr", initialOcr)
        .putNullable("initial_photo_path", initialPhotoPath)
        .put("start_date_time", startDateTime)
        .put("manual_correction_start", manualCorrectionStart)
        .putNullable("final_confirmed", finalConfirmed)
        .putNullable("final_ocr", finalOcr)
        .putNullable("final_photo_path", finalPhotoPath)
        .putNullable("final_date_time", finalDateTime)
        .put("status", status)
}

private fun localRecordFromJson(json: JSONObject): LocalHourmeterRecord {
    return LocalHourmeterRecord(
        localId = json.optString("local_id"),
        serverId = json.nullableInt("server_id"),
        vehicleId = json.getInt("vehicle_id"),
        vehicleLabel = json.optString("vehicle_label"),
        operatorId = json.nullableInt("operator_id"),
        operatorLabel = json.nullableString("operator_label"),
        fundoId = json.nullableInt("fundo_id"),
        sectorId = json.nullableInt("sector_id"),
        loteId = json.nullableInt("lote_id"),
        initialConfirmed = json.optString("initial_confirmed"),
        initialOcr = json.nullableString("initial_ocr"),
        initialPhotoPath = json.nullableString("initial_photo_path"),
        startDateTime = json.optString("start_date_time"),
        manualCorrectionStart = json.optBoolean("manual_correction_start"),
        finalConfirmed = json.nullableString("final_confirmed"),
        finalOcr = json.nullableString("final_ocr"),
        finalPhotoPath = json.nullableString("final_photo_path"),
        finalDateTime = json.nullableString("final_date_time"),
        status = json.optString("status", "PENDIENTE_ENVIO"),
    )
}

private fun JSONObject.putNullable(key: String, value: Any?): JSONObject {
    return if (value == null) {
        put(key, JSONObject.NULL)
    } else {
        put(key, value)
    }
}

private fun JSONObject.nullableString(key: String): String? {
    return if (isNull(key)) null else optString(key)
}

private fun JSONObject.nullableInt(key: String): Int? {
    return if (isNull(key) || !has(key)) null else optInt(key)
}

private fun Vehicle.matchesType(type: RegistrationType): Boolean {
    val isTractor = typeName.contains("tractor", ignoreCase = true) ||
        name.contains("tractor", ignoreCase = true) ||
        code.startsWith("TR", ignoreCase = true)
    val isHeavy = typeName.contains("maquinaria pesada", ignoreCase = true) ||
        code.startsWith("MP", ignoreCase = true)

    return when (type) {
        RegistrationType.TRACTORS -> isTractor
        RegistrationType.HEAVY -> isHeavy
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HorometroTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    HorometroApp()
                }
            }
        }
    }
}

@Composable
fun HorometroApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var session by remember { mutableStateOf<AppSession?>(null) }
    var syncSession by remember { mutableStateOf<AppSession?>(null) }
    var selectedType by remember { mutableStateOf<RegistrationType?>(null) }
    var cachedData by remember { mutableStateOf<CachedFieldData?>(null) }
    var syncLoading by remember { mutableStateOf(false) }
    var syncProgress by remember { mutableStateOf(0) }
    var syncError by remember { mutableStateOf<String?>(null) }
    val api = remember { AgroControlApi(DEFAULT_API_URL.trimEnd('/')) }

    LaunchedEffect(Unit) {
        cachedData = loadFieldDataCache(context)
    }

    fun syncMasters() {
        syncLoading = true
        syncProgress = 0
        syncError = null
        scope.launch {
            runCatching {
                val syncSession = api.login(DEFAULT_RESPONSIBLE_USER, DEFAULT_RESPONSIBLE_PASSWORD)
                syncProgress = 8
                val data = api.fieldData(syncSession.token) { progress -> syncProgress = progress }
                val cached = CachedFieldData(data = data, syncedAt = currentDateTime())
                saveFieldDataCache(context, cached)
                syncSession to cached
            }.onSuccess { (newSyncSession, cached) ->
                syncSession = newSyncSession
                cachedData = cached
            }.onFailure {
                syncError = it.message ?: "No se pudo sincronizar datos."
            }
            syncLoading = false
            if (syncError == null) {
                syncProgress = 100
            }
        }
    }

    when {
        selectedType == null -> VehicleTypeSelectionScreen(
            hasLocalData = cachedData != null,
            lastSync = cachedData?.syncedAt,
            syncing = syncLoading,
            syncProgress = syncProgress,
            syncError = syncError,
            onSync = ::syncMasters,
            onTractors = {
                if (cachedData == null) {
                    syncError = "Sincroniza los datos antes de registrar tractores."
                } else {
                    selectedType = RegistrationType.TRACTORS
                }
            },
            onHeavy = {
                if (cachedData == null) {
                    syncError = "Sincroniza los datos antes de registrar maquinaria pesada."
                } else {
                    selectedType = RegistrationType.HEAVY
                }
            },
        )

        selectedType == RegistrationType.HEAVY && session == null -> ResponsibleLoginScreen(
            onLogin = { usuario, password -> api.login(usuario, password) },
            onLoggedIn = { session = it },
            onBack = { selectedType = null },
        )

        selectedType == RegistrationType.TRACTORS && cachedData != null -> FieldHomeScreen(
            api = api,
            session = AppSession(token = syncSession?.token.orEmpty(), userName = "Registro directo", role = "OPERACION"),
            registrationType = RegistrationType.TRACTORS,
            initialData = cachedData!!.data,
            onDataSynced = { data ->
                val cached = CachedFieldData(data = data, syncedAt = currentDateTime())
                cachedData = cached
                saveFieldDataCache(context, cached)
            },
            onBack = {
                session = null
                selectedType = null
            },
            onLogout = {
                session = null
                selectedType = null
            },
        )

        session != null && selectedType != null -> FieldHomeScreen(
            api = api,
            session = session!!,
            registrationType = selectedType!!,
            initialData = cachedData?.data ?: FieldData.EMPTY,
            onDataSynced = { data ->
                val cached = CachedFieldData(data = data, syncedAt = currentDateTime())
                cachedData = cached
                saveFieldDataCache(context, cached)
            },
            onBack = {
                session = null
                selectedType = null
            },
            onLogout = {
                session = null
                selectedType = null
            },
        )
    }
}

@Composable
fun VehicleTypeSelectionScreen(
    hasLocalData: Boolean,
    lastSync: String?,
    syncing: Boolean,
    syncProgress: Int,
    syncError: String?,
    onSync: () -> Unit,
    onTractors: () -> Unit,
    onHeavy: () -> Unit,
) {
    Scaffold(
        containerColor = AppBackground,
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppBackground)
                    .navigationBarsPadding()
                    .padding(horizontal = 18.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (!hasLocalData) {
                    Text("Sincroniza datos antes de ingresar al formulario.", color = AppMuted, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
                }
                InfoLine("Inicio 7:00 a 8:00 a. m.  Cierre maximo 7:30 p. m.", compact = true)
            }
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .statusBarsPadding()
                .padding(horizontal = 18.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            AppLogoHeader()
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "Que vas a registrar?",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = AppText,
                )
                Text(
                    "Elige el flujo correcto para iniciar la captura.",
                    color = AppMuted,
                    fontWeight = FontWeight.SemiBold,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            VehicleOptionCard(
                title = RegistrationType.TRACTORS.title,
                subtitle = "Sede, tractor, operario y foto",
                icon = Icons.Filled.Agriculture,
                selected = false,
                onClick = onTractors,
            )
            VehicleOptionCard(
                title = RegistrationType.HEAVY.title,
                subtitle = "Login de responsable y equipo",
                icon = Icons.Filled.Construction,
                selected = false,
                onClick = onHeavy,
            )
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                enabled = !syncing,
                colors = ButtonDefaults.buttonColors(containerColor = if (hasLocalData) AppGreenDark else AppGreen),
                shape = RoundedCornerShape(16.dp),
                onClick = onSync,
            ) {
                if (syncing) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Icon(Icons.Filled.Refresh, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Sincronizar", fontWeight = FontWeight.Black)
                }
            }
            val syncLabel = lastSync?.let { "Ultima sincronizacion: ${displayDateTime(it)}" }
                ?: "Sin datos locales sincronizados."
            InfoLine(syncLabel, compact = true)
            if (syncError != null) {
                ErrorBox(syncError)
            }
            if (syncing) {
                ProgressBox("Sincronizando datos", syncProgress)
            }
            Spacer(Modifier.weight(1f))
        }
    }
}

@Composable
fun AppLogoHeader() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(AppHeaderGreen)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            painter = painterResource(id = R.drawable.logo_encabezado),
            contentDescription = "AgroControl Horometros",
            modifier = Modifier
                .height(56.dp)
                .weight(1f),
            contentScale = ContentScale.Fit,
            alignment = Alignment.CenterStart,
            colorFilter = ColorFilter.tint(Color.White),
        )
    }
}

@Composable
fun SimpleTopBar(title: String, subtitle: String, onBack: (() -> Unit)? = null, onLogout: (() -> Unit)? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(AppHeaderGreen)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            IconButton(onClick = onBack) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Volver", tint = Color.White)
            }
        } else {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color.White.copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Map, contentDescription = null, tint = Color.White)
            }
            Spacer(Modifier.width(12.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, color = Color.White, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
            Text(subtitle, color = Color(0xFFEDEBDD), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
        }
        if (onLogout != null) {
            IconButton(onClick = onLogout) {
                Icon(Icons.Filled.Logout, contentDescription = "Salir", tint = Color.White)
            }
        }
    }
}

@Composable
fun ResponsibleLoginScreen(
    onLogin: suspend (String, String) -> AppSession,
    onLoggedIn: (AppSession) -> Unit,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var usuario by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    BackHandler(onBack = onBack)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppBackground)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        SimpleTopBar(
            title = "Maquinaria pesada",
            subtitle = "Ingreso del responsable",
            onBack = onBack,
        )
        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            FormTitle(
                title = "Ingreso seguro",
                subtitle = "Solo para registro de maquinaria pesada.",
                icon = Icons.Filled.Lock,
            )
            Card(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Usuario", fontWeight = FontWeight.Black, color = Color(0xFF064E3B))
                    AppTextField("Ingresa tu usuario", usuario, { usuario = it })
                    Text("Contrasena", fontWeight = FontWeight.Black, color = Color(0xFF064E3B))
                    AppTextField(
                        label = "Ingresa tu contrasena",
                        value = password,
                        onChange = { password = it },
                        keyboardType = KeyboardType.Password,
                        password = true,
                    )
                    if (error != null) {
                        ErrorBox(error!!)
                    }
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        enabled = !loading,
                        colors = ButtonDefaults.buttonColors(containerColor = AppGreen),
                        shape = RoundedCornerShape(16.dp),
                        onClick = {
                            loading = true
                            error = null
                            scope.launch {
                                runCatching { onLogin(usuario, password) }
                                    .onSuccess(onLoggedIn)
                                    .onFailure { error = it.message ?: "No se pudo iniciar sesion." }
                                loading = false
                            }
                        },
                    ) {
                        if (loading) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                        } else {
                            Icon(Icons.Filled.Person, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Ingresar", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }
            InfoLine("El responsable quedara asociado a todos los registros realizados hoy.")
        }
    }
}

@Composable
fun AutoLoginScreen(
    onLogin: suspend () -> AppSession,
    onLoggedIn: (AppSession) -> Unit,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }

    BackHandler(onBack = onBack)

    LaunchedEffect(Unit) {
        runCatching { onLogin() }
            .onSuccess(onLoggedIn)
            .onFailure { error = it.message ?: "No se pudo preparar el registro directo." }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppBackground)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator(color = AppGreen)
        Spacer(Modifier.height(16.dp))
        Text("Preparando registro de tractores", fontWeight = FontWeight.Black, color = AppGreenDark)
        Text("No se requiere login del operario.", color = AppMuted, fontWeight = FontWeight.SemiBold)
        if (error != null) {
            Spacer(Modifier.height(16.dp))
            ErrorBox(error!!)
            TextButton(onClick = {
                error = null
                scope.launch {
                    runCatching { onLogin() }
                        .onSuccess(onLoggedIn)
                        .onFailure { error = it.message ?: "No se pudo preparar el registro directo." }
                }
            }) {
                Text("Reintentar", color = Color(0xFF166534), fontWeight = FontWeight.Black)
            }
            TextButton(onClick = onBack) {
                Text("Volver", color = Color(0xFF166534), fontWeight = FontWeight.Black)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FieldHomeScreen(
    api: AgroControlApi,
    session: AppSession,
    registrationType: RegistrationType,
    initialData: FieldData,
    onDataSynced: (FieldData) -> Unit,
    onBack: () -> Unit,
    onLogout: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var tab by remember { mutableStateOf(FieldTab.Start) }
    var vehicles by remember(initialData, registrationType) { mutableStateOf(initialData.vehicles.filter { it.matchesType(registrationType) }) }
    var operators by remember(initialData) { mutableStateOf(initialData.operators) }
    var pending by remember(initialData, registrationType) { mutableStateOf(initialData.pending.filter { it.vehicle?.matchesType(registrationType) == true }) }
    var loading by remember { mutableStateOf(false) }
    var sendProgress by remember { mutableStateOf<Int?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    var localRecords by remember { mutableStateOf(loadLocalRecords(context)) }

    fun persistLocal(records: List<LocalHourmeterRecord>) {
        saveLocalRecords(context, records)
        localRecords = records
    }

    fun sendPendingLocal() {
        val queue = localRecords.filter { it.status == "PENDIENTE_ENVIO" || it.status == "PENDIENTE_ENVIO_CIERRE" }.sortedBy { it.startDateTime }
        if (queue.isEmpty()) {
            sendProgress = null
            return
        }
        if (sendProgress != null) {
            return
        }

        sendProgress = 0
        error = null
        scope.launch {
            val token = if (session.token.isNotBlank()) {
                session.token
            } else {
                runCatching { api.login(DEFAULT_RESPONSIBLE_USER, DEFAULT_RESPONSIBLE_PASSWORD).token }
                    .getOrElse {
                        error = it.message ?: "No se pudo iniciar sesion para enviar pendientes."
                        sendProgress = null
                        return@launch
                    }
            }
            val blockedVehicles = mutableSetOf<Int>()
            queue.forEachIndexed { index, local ->
                if (local.vehicleId in blockedVehicles) return@forEachIndexed
                runCatching {
                    api.submitLocalRecord(token, local) { serverId ->
                        persistLocal(localRecords.map { if (it.localId == local.localId) it.copy(serverId = serverId) else it })
                    }
                }
                    .onSuccess { sent ->
                        persistLocal(localRecords.map { current ->
                            if (current.localId != local.localId) current
                            else if (current.finalConfirmed != local.finalConfirmed) current.copy(serverId = sent.serverId)
                            else sent
                        })
                    }
                    .onFailure {
                        blockedVehicles.add(local.vehicleId)
                        error = it.message ?: "No se pudieron enviar todos los pendientes."
                    }
                sendProgress = (((index + 1).toFloat() / queue.size.toFloat()) * 100).toInt()
            }
            if (error == null) {
                success = "Pendientes enviados correctamente."
                runCatching { api.pendingRecords(token) }.onSuccess { records ->
                    pending = records.filter { record -> record.vehicle?.matchesType(registrationType) == true }
                }
            }
            sendProgress = null
            if (error == null && localRecords.any { it.status == "PENDIENTE_ENVIO" || it.status == "PENDIENTE_ENVIO_CIERRE" }) {
                sendPendingLocal()
            }
        }
    }

    fun refresh() {
        loading = true
        error = null
        scope.launch {
            runCatching {
                api.fieldData(session.token)
            }.onSuccess { data ->
                vehicles = data.vehicles.filter { it.matchesType(registrationType) }
                operators = data.operators
                pending = data.pending.filter { it.vehicle?.matchesType(registrationType) == true }
                onDataSynced(data)
            }.onFailure {
                error = it.message ?: "No se pudo cargar informacion."
            }
            loading = false
        }
    }

    ConnectivityWatcher(
        enabled = localRecords.any { it.status == "PENDIENTE_ENVIO" || it.status == "PENDIENTE_ENVIO_CIERRE" },
        onAvailable = { sendPendingLocal() },
    )

    BackHandler {
        if (tab != FieldTab.Start) {
            tab = FieldTab.Start
        } else {
            onBack()
        }
    }

    Scaffold(
        containerColor = AppBackground,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppBackground)
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                SimpleTopBar(
                    title = registrationType.title,
                    subtitle = if (registrationType == RegistrationType.TRACTORS) "Registro directo" else session.userName,
                    onBack = onBack,
                    onLogout = onLogout,
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFFE8EEF2))
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    TabButton("Inicio", tab == FieldTab.Start, Modifier.weight(1f)) { tab = FieldTab.Start }
                    TabButton("Cierre", tab == FieldTab.Close, Modifier.weight(1f)) { tab = FieldTab.Close }
                    TabButton("Historial", tab == FieldTab.History, Modifier.weight(1f)) { tab = FieldTab.History }
                }
            }
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(AppBackground)
                .padding(innerPadding)
                .padding(horizontal = 16.dp, vertical = 10.dp),
        ) {
            if (success != null) {
                SuccessBox(success!!)
                Spacer(Modifier.height(12.dp))
            }
            if (error != null) {
                ErrorBox(error!!)
                Spacer(Modifier.height(12.dp))
            }
            if (loading) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Sincronizando...", color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.height(12.dp))
            }
            if (sendProgress != null) {
                ProgressBox("Enviando pendientes", sendProgress ?: 0)
                Spacer(Modifier.height(12.dp))
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
            ) {
                when (tab) {
                    FieldTab.Start -> StartScreen(
                        registrationType = registrationType,
                        vehicles = vehicles,
                        operators = operators,
                        localRecords = localRecords,
                        config = initialData.config,
                        onCancel = onBack,
                        onRegister = { vehicleId, operatorId, fundoId, sectorId, loteId, confirmed, ocr, manualCorrection, dateTime, photoPath ->
                            val selectedOperator = operators.firstOrNull { it.id == operatorId }
                            val local = LocalHourmeterRecord(
                                localId = java.util.UUID.randomUUID().toString(), serverId = null,
                                vehicleId = vehicleId,
                                vehicleLabel = vehicles.firstOrNull { it.id == vehicleId }?.let { "${it.code} - ${it.name}" } ?: "Equipo $vehicleId",
                                operatorId = operatorId,
                                operatorLabel = selectedOperator?.let { "${it.dni} - ${it.fullName}" },
                                fundoId = null, sectorId = null, loteId = null,
                                initialConfirmed = confirmed, initialOcr = null,
                                initialPhotoPath = photoPath, startDateTime = dateTime,
                                manualCorrectionStart = false, finalConfirmed = null, finalOcr = null,
                                finalPhotoPath = null, finalDateTime = null, status = "PENDIENTE_ENVIO",
                            )
                            persistLocal(localRecords + local)
                            success = "Registro guardado."
                            tab = FieldTab.Close
                            sendPendingLocal()
                        },
                    )

                    FieldTab.Close -> CloseScreen(
                        registrationType = registrationType,
                        pending = pending,
                        vehicles = vehicles,
                        localRecords = localRecords,
                        onRefresh = { refresh() },
                        onSendPending = { sendPendingLocal() },
                        onCloseLocal = { localId, confirmed, ocr, dateTime, photoPath ->
                            persistLocal(localRecords.map {
                                if (it.localId == localId) {
                                    it.copy(finalConfirmed = confirmed, finalOcr = ocr, finalPhotoPath = photoPath, finalDateTime = dateTime, status = "PENDIENTE_ENVIO_CIERRE")
                                } else {
                                    it
                                }
                            })
                            success = "Cierre guardado localmente."
                            sendPendingLocal()
                        },
                        onClose = { recordId, confirmed, ocr, dateTime, photoPath ->
                            val remote = pending.firstOrNull { it.id == recordId }
                            val existing = localRecords.firstOrNull { it.serverId == recordId }
                            val local = existing?.copy(
                                finalConfirmed = confirmed, finalOcr = null, finalPhotoPath = photoPath,
                                finalDateTime = dateTime, status = "PENDIENTE_ENVIO_CIERRE",
                            ) ?: LocalHourmeterRecord(
                                localId = "server-$recordId", serverId = recordId,
                                vehicleId = remote?.vehicle?.id ?: 0,
                                vehicleLabel = remote?.vehicle?.code ?: "Equipo $recordId",
                                operatorId = remote?.operator?.id, operatorLabel = remote?.operator?.fullName,
                                fundoId = null, sectorId = null, loteId = null,
                                initialConfirmed = remote?.initial ?: "0", initialOcr = null,
                                initialPhotoPath = null, startDateTime = remote?.date ?: dateTime,
                                manualCorrectionStart = false, finalConfirmed = confirmed, finalOcr = null,
                                finalPhotoPath = photoPath, finalDateTime = dateTime, status = "PENDIENTE_ENVIO_CIERRE",
                            )
                            persistLocal(localRecords.filterNot { it.serverId == recordId } + local)
                            success = "Cierre guardado."
                            sendPendingLocal()
                        },
                    )

                    FieldTab.History -> HistoryScreen(
                        serverPending = pending,
                        localRecords = localRecords,
                        onSendPending = { sendPendingLocal() },
                    )
                }
            }
        }
    }
}

enum class FieldTab {
    Start,
    Close,
    History,
}

@Composable
fun ConnectivityWatcher(
    enabled: Boolean,
    onAvailable: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val currentOnAvailable by rememberUpdatedState(onAvailable)

    DisposableEffect(enabled) {
        if (!enabled) {
            onDispose {}
        } else {
            val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    scope.launch { currentOnAvailable() }
                }

                override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                    if (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
                        scope.launch { currentOnAvailable() }
                    }
                }
            }

            val activeNetwork = manager.activeNetwork
            val hasInternet = activeNetwork
                ?.let { manager.getNetworkCapabilities(it) }
                ?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true

            if (hasInternet) {
                scope.launch { currentOnAvailable() }
            }

            manager.registerNetworkCallback(request, callback)

            onDispose {
                runCatching { manager.unregisterNetworkCallback(callback) }
            }
        }
    }
}

@Composable
fun ProgressBox(title: String, progress: Int) {
    val safeProgress = progress.coerceIn(0, 100)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .border(1.dp, AppLine, RoundedCornerShape(16.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, modifier = Modifier.weight(1f), color = AppText, fontWeight = FontWeight.Black)
            Text("$safeProgress%", color = AppGreenDark, fontWeight = FontWeight.Black)
        }
        LinearProgressIndicator(
            progress = { safeProgress / 100f },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(99.dp)),
            color = AppGreen,
            trackColor = AppGreenSoft,
        )
    }
}

@Composable
fun HistoryScreen(
    serverPending: List<HourmeterRecord>,
    localRecords: List<LocalHourmeterRecord>,
    onSendPending: () -> Unit,
) {
    val pendingSend = localRecords.any { it.status == "PENDIENTE_ENVIO" || it.status == "PENDIENTE_ENVIO_CIERRE" }
    val localServerIds = localRecords.mapNotNull { it.serverId }.toSet()
    val visibleServerPending = serverPending.filterNot { it.id in localServerIds }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        FormTitle(
            title = "Registros",
            subtitle = "${localRecords.size + visibleServerPending.size} movimientos guardados en el equipo.",
            icon = Icons.Filled.Speed,
        )
        if (pendingSend) {
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppGreenDark),
                shape = RoundedCornerShape(16.dp),
                onClick = onSendPending,
            ) {
                Icon(Icons.Filled.Refresh, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Enviar pendientes", fontWeight = FontWeight.Black)
            }
        }
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            lazyItems(localRecords.sortedByDescending { it.startDateTime }, key = { it.localId }) { record ->
                LocalHistoryCard(record)
            }
            lazyItems(visibleServerPending, key = { "server-${it.id}" }) { record ->
                ServerHistoryCard(record)
            }
            if (localRecords.isEmpty() && visibleServerPending.isEmpty()) {
                item {
                    Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                        Row(
                            modifier = Modifier.padding(18.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Filled.Info, contentDescription = null, tint = AppGreen)
                            Spacer(Modifier.width(10.dp))
                            Text("Aun no hay registros en este dispositivo.", color = AppMuted, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LocalHistoryCard(record: LocalHourmeterRecord) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(13.dp))
                        .background(AppGreenSoft),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Speed, contentDescription = null, tint = AppGreen)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(record.vehicleLabel, color = AppText, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(record.startDateTime.replace("T", " "), color = AppMuted, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                    if (!record.operatorLabel.isNullOrBlank()) {
                        Text(record.operatorLabel, color = AppMuted, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                StatePill(readableLocalStatus(record.status))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ReadingBox("Inicial", record.initialConfirmed, Modifier.weight(1f))
                ReadingBox("Final", record.finalConfirmed ?: "-", Modifier.weight(1f))
            }
        }
    }
}

@Composable
fun ServerHistoryCard(record: HourmeterRecord) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(13.dp))
                        .background(AppGreenSoft),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.AccessTime, contentDescription = null, tint = AppGreen)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(record.vehicle?.let { "${it.code} - ${it.name}" } ?: "Equipo", color = AppText, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(record.date, color = AppMuted, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
                    if (record.operator != null) {
                        Text("${record.operator.dni} - ${record.operator.fullName}", color = AppMuted, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                StatePill("Pendiente de cierre")
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ReadingBox("Inicial", record.initial ?: "-", Modifier.weight(1f))
                ReadingBox("Final", record.final ?: "-", Modifier.weight(1f))
            }
        }
    }
}

private fun readableLocalStatus(status: String): String {
    return when (status) {
        "PENDIENTE_ENVIO" -> "Pendiente de envio"
        "PENDIENTE_CIERRE" -> "Pendiente de cierre"
        "PENDIENTE_ENVIO_CIERRE" -> "Pendiente de envio"
        "CERRADO" -> "Cerrado"
        "ENVIADO" -> "Enviado"
        else -> status.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }
    }
}

@Composable
fun FormTitle(title: String, subtitle: String, icon: ImageVector) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(RoundedCornerShape(15.dp))
                .background(AppGreenSoft),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = AppGreen, modifier = Modifier.size(25.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, color = AppText)
            Text(subtitle, color = AppMuted, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun StepProgress(current: Int, total: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        repeat(total) { index ->
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(5.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (index < current) AppGreen else AppLine),
            )
        }
    }
}

@Composable
fun StartScreen(
    registrationType: RegistrationType,
    vehicles: List<Vehicle>,
    operators: List<Operator>,
    localRecords: List<LocalHourmeterRecord>,
    config: HourmeterConfig,
    onCancel: () -> Unit,
    onRegister: (Int, Int?, Int?, Int?, Int?, String, String?, Boolean, String, String?) -> Unit,
) {
    var sedeId by remember { mutableStateOf<Int?>(null) }
    var vehicleId by remember { mutableStateOf<Int?>(null) }
    var operatorId by remember { mutableStateOf<Int?>(null) }
    var reading by remember { mutableStateOf("") }
    var photo by remember { mutableStateOf<String?>(null) }
    var showCamera by remember { mutableStateOf(false) }
    var showQr by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val sedes = remember(vehicles) {
        vehicles.filter { it.sedeId != null }.distinctBy { it.sedeId }
            .map { LocationOption(it.sedeId!!, "", it.sedeName ?: "Sede ${it.sedeId}") }
            .sortedBy { it.name }
    }
    val filtered = remember(vehicles, sedeId) { vehicles.filter { sedeId != null && it.sedeId == sedeId } }
    val selected = filtered.firstOrNull { it.id == vehicleId }
    val availableOperators = remember(operators, registrationType) {
        operators.filter {
            when (registrationType) {
                RegistrationType.HEAVY -> it.type.equals("MAQUINISTA", ignoreCase = true)
                RegistrationType.TRACTORS -> it.type.equals("TRACTORISTA", ignoreCase = true) ||
                    it.type.equals("OPERARIO", ignoreCase = true) ||
                    it.type.equals("CONDUCTOR", ignoreCase = true)
            }
        }
    }
    val selectedOperator = availableOperators.firstOrNull { it.id == operatorId }
    val localValues = localRecords.filter { it.vehicleId == vehicleId }
        .mapNotNull { (it.finalConfirmed ?: it.initialConfirmed).toBigDecimalOrNull() }
        .filter { it > java.math.BigDecimal.ZERO }
    val reference = (localValues + listOfNotNull(selected?.lastValid?.toBigDecimalOrNull()?.takeIf { it > java.math.BigDecimal.ZERO })).maxOrNull()?.toPlainString()
    val validation = readingError(reading, reference, true, config.startToleranceHours)
    val vehicleLabel = if (registrationType == RegistrationType.TRACTORS) "Tractor" else "Vehiculo"
    val photoRequired = registrationType == RegistrationType.TRACTORS
    BackHandler { onCancel() }
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        FormTitle("Registro inicial", registrationType.title, Icons.Filled.Speed)
        SimpleDropdownField(
            label = "Sede", placeholder = "Selecciona una sede",
            selectedLabel = sedes.firstOrNull { it.id == sedeId }?.name,
            items = sedes, icon = Icons.Filled.Map, itemLabel = { it.name },
            onSelected = { sedeId = it.id; vehicleId = null; operatorId = null; reading = ""; photo = null },
        )
        SimpleDropdownField(
            label = vehicleLabel, placeholder = "Selecciona un equipo",
            selectedLabel = selected?.let { "${it.code} - ${it.name}" },
            items = filtered, enabled = sedeId != null,
            icon = Icons.Filled.Agriculture, itemLabel = { "${it.code} - ${it.name}" },
            onSelected = { vehicleId = it.id; operatorId = null; reading = ""; photo = null; message = null },
            trailingAction = {
                IconButton(enabled = sedeId != null, onClick = { showQr = true }) {
                    Icon(Icons.Filled.QrCodeScanner, contentDescription = "Escanear QR")
                }
            },
        )
        SimpleDropdownField(
            label = "Operario",
            placeholder = if (registrationType == RegistrationType.HEAVY) "Selecciona maquinista" else "Selecciona conductor",
            selectedLabel = selectedOperator?.let { "${it.dni} - ${it.fullName}" },
            items = availableOperators,
            enabled = selected != null,
            icon = Icons.Filled.Badge,
            itemLabel = { "${it.dni} - ${it.fullName}" },
            onSelected = { operatorId = it.id },
            emptyText = if (registrationType == RegistrationType.HEAVY) "No hay maquinistas sincronizados" else "No hay conductores sincronizados",
            searchable = true,
        )
        if (selected != null) {
            if (!selected.referenceSynced) {
                ErrorBox("Sincroniza los maestros para obtener la referencia del equipo.")
            } else {
                InfoLine(reference?.let { "Ultimo horometro valido: $it" } ?: "Sin base. Esta lectura sera la primera referencia.", compact = true)
                AppTextField("Horometro", reading, { reading = it }, KeyboardType.Decimal)
                if (reading.isNotBlank() && validation != null) ErrorBox(validation)
                OutlinedButton(onClick = { showCamera = true }, enabled = validation == null, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.CameraAlt, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (photo == null) if (photoRequired) "Tomar foto de evidencia" else "Tomar foto opcional" else "Repetir foto")
                }
                photo?.let { CapturedPhotoPreviewCard(it) }
            }
        }
        message?.let { ErrorBox(it) }
        Button(
            enabled = selected?.referenceSynced == true && operatorId != null && validation == null && reading.isNotBlank() && (!photoRequired || photo != null),
            modifier = Modifier.fillMaxWidth().height(50.dp),
            onClick = {
                onRegister(vehicleId!!, operatorId, null, null, null, reading.replace(',', '.'), null, false, currentDateTime(), photo)
            },
        ) {
            Icon(Icons.Filled.CheckCircle, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text(if (!photoRequired && photo == null) "Guardar sin foto" else "Guardar registro")
        }
        Spacer(Modifier.height(96.dp))
    }
    if (showCamera) CameraCaptureBottomSheet(
        onBack = { showCamera = false },
        onDetected = { _, path -> photo = path; showCamera = false },
    )
    if (showQr) QrScannerBottomSheet(
        onBack = { showQr = false },
        onCode = { code ->
            val found = filtered.firstOrNull { it.code.equals(code.trim(), true) }
            vehicleId = found?.id
            operatorId = null; reading = ""; photo = null
            message = if (found == null) "No se encontro el tractor en la sede seleccionada." else null
            showQr = false
        },
    )
}

private fun latestLocalReference(vehicleId: Int, initial: String, vehicles: List<Vehicle>, records: List<LocalHourmeterRecord>): String {
    return (records.filter { it.vehicleId == vehicleId }.mapNotNull { (it.finalConfirmed ?: it.initialConfirmed).toBigDecimalOrNull()?.takeIf { value -> value > java.math.BigDecimal.ZERO } }
        + listOfNotNull(initial.toBigDecimalOrNull()?.takeIf { it > java.math.BigDecimal.ZERO }, vehicles.firstOrNull { it.id == vehicleId }?.lastValid?.toBigDecimalOrNull()?.takeIf { it > java.math.BigDecimal.ZERO }))
        .maxOrNull()?.toPlainString() ?: initial
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CameraCaptureBottomSheet(
    kind: String = "inicio",
    onBack: () -> Unit,
    onDetected: (String, String) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onBack,
        sheetState = sheetState,
        containerColor = Color(0xFF07130F),
        dragHandle = null,
    ) {
        CameraCaptureContent(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.65f),
            kind = kind,
            onBack = onBack,
            onDetected = onDetected,
        )
    }
}

@Composable
fun CameraCaptureContent(
    modifier: Modifier = Modifier,
    kind: String,
    onBack: () -> Unit,
    onDetected: (String, String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val captureScope = rememberCoroutineScope()
    val executor = remember(context) { ContextCompat.getMainExecutor(context) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED,
        )
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasCameraPermission = granted
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            runCatching {
                ProcessCameraProvider.getInstance(context).get().unbindAll()
            }
        }
    }

    Column(
        modifier = modifier
            .background(Color(0xFF07130F))
            .navigationBarsPadding()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            IconButton(onClick = onBack) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Volver", tint = Color.White)
            }
            Column(Modifier.weight(1f)) {
                Text("Capturar horometro", color = Color.White, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
                Text("Enfoca solo el visor del contador", color = Color(0xFFB7C6BE), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
            }
        }

        if (!hasCameraPermission) {
            InfoLine("Se necesita permiso de camara para capturar el horometro.")
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppGreen),
                shape = RoundedCornerShape(16.dp),
                onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
            ) {
                Icon(Icons.Filled.CameraAlt, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Permitir camara", fontWeight = FontWeight.Black)
            }
        } else {
            AndroidView(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clip(RoundedCornerShape(24.dp))
                    .border(1.dp, Color(0xFF28463A), RoundedCornerShape(24.dp)),
                factory = { viewContext ->
                    PreviewView(viewContext).also { previewView ->
                        val cameraProviderFuture = ProcessCameraProvider.getInstance(viewContext)
                        cameraProviderFuture.addListener(
                            {
                                val cameraProvider = cameraProviderFuture.get()
                                val preview = CameraPreview.Builder().build().also { cameraPreview ->
                                    cameraPreview.setSurfaceProvider(previewView.surfaceProvider)
                                }
                                val capture = ImageCapture.Builder()
                                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                                    .setJpegQuality(82)
                                    .build()

                                runCatching {
                                    cameraProvider.unbindAll()
                                    cameraProvider.bindToLifecycle(
                                        lifecycleOwner,
                                        CameraSelector.DEFAULT_BACK_CAMERA,
                                        preview,
                                        capture,
                                    )
                                    imageCapture = capture
                                }.onFailure {
                                    error = it.message ?: "No se pudo iniciar la camara."
                                }
                            },
                            executor,
                        )
                    }
                },
            )

            if (error != null) {
                ErrorBox(error!!)
            }

            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                enabled = imageCapture != null && !loading,
                colors = ButtonDefaults.buttonColors(containerColor = AppGreen),
                shape = RoundedCornerShape(16.dp),
                onClick = {
                    val capture = imageCapture ?: return@Button
                    loading = true
                    error = null
                    val photoFile = createEvidenceFile(context.filesDir, kind)
                    capture.takePicture(
                        ImageCapture.OutputFileOptions.Builder(photoFile).build(),
                        executor,
                        object : ImageCapture.OnImageSavedCallback {
                            override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                                captureScope.launch {
                                    runCatching {
                                        withContext(Dispatchers.IO) { compressEvidence(photoFile) }
                                    }.onSuccess {
                                        loading = false
                                        onDetected("", photoFile.absolutePath)
                                    }.onFailure {
                                        loading = false
                                        error = it.message ?: "No se pudo preparar la foto."
                                    }
                                }
                            }

                            override fun onError(exception: ImageCaptureException) {
                                photoFile.delete()
                                loading = false
                                error = exception.message ?: "No se pudo capturar la foto."
                            }
                        },
                    )
                },
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Icon(Icons.Filled.CameraAlt, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Tomar foto", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalGetImage::class)
@Composable
fun QrScannerBottomSheet(
    onBack: () -> Unit,
    onCode: (String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val executor = remember(context) { ContextCompat.getMainExecutor(context) }
    val scanner = remember { BarcodeScanning.getClient() }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED,
        )
    }
    var detected by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasCameraPermission = granted
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            scanner.close()
            runCatching {
                ProcessCameraProvider.getInstance(context).get().unbindAll()
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onBack,
        sheetState = sheetState,
        containerColor = Color(0xFF07130F),
        dragHandle = null,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.7f)
                .background(Color(0xFF07130F))
                .navigationBarsPadding()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Filled.Close, contentDescription = "Cerrar", tint = Color.White)
                }
                Column(Modifier.weight(1f)) {
                    Text("Escanear QR", color = Color.White, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                    Text("El QR debe contener solo el codigo del tractor.", color = Color(0xFFB7C6BE), fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
                }
            }

            if (!hasCameraPermission) {
                InfoLine("Se necesita permiso de camara para escanear el QR.")
                Button(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AppGreen),
                    shape = RoundedCornerShape(16.dp),
                    onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                ) {
                    Icon(Icons.Filled.CameraAlt, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Permitir camara", fontWeight = FontWeight.Black)
                }
            } else {
                AndroidView(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .clip(RoundedCornerShape(22.dp))
                        .border(1.dp, Color(0xFF28463A), RoundedCornerShape(22.dp)),
                    factory = { viewContext ->
                        PreviewView(viewContext).also { previewView ->
                            val cameraProviderFuture = ProcessCameraProvider.getInstance(viewContext)
                            cameraProviderFuture.addListener(
                                {
                                    val cameraProvider = cameraProviderFuture.get()
                                    val preview = CameraPreview.Builder().build().also { cameraPreview ->
                                        cameraPreview.setSurfaceProvider(previewView.surfaceProvider)
                                    }
                                    val analysis = ImageAnalysis.Builder()
                                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                        .build()
                                        .also { imageAnalysis ->
                                            imageAnalysis.setAnalyzer(executor) { imageProxy ->
                                                if (detected) {
                                                    imageProxy.close()
                                                    return@setAnalyzer
                                                }

                                                val mediaImage = imageProxy.image
                                                if (mediaImage == null) {
                                                    imageProxy.close()
                                                    return@setAnalyzer
                                                }

                                                val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                                                scanner.process(image)
                                                    .addOnSuccessListener { barcodes ->
                                                        val value = barcodes
                                                            .firstOrNull { it.format == Barcode.FORMAT_QR_CODE && !it.rawValue.isNullOrBlank() }
                                                            ?.rawValue

                                                        if (!value.isNullOrBlank() && !detected) {
                                                            detected = true
                                                            onCode(value)
                                                        }
                                                    }
                                                    .addOnFailureListener {
                                                        error = it.message ?: "No se pudo leer el QR."
                                                    }
                                                    .addOnCompleteListener {
                                                        imageProxy.close()
                                                    }
                                            }
                                        }

                                    runCatching {
                                        cameraProvider.unbindAll()
                                        cameraProvider.bindToLifecycle(
                                            lifecycleOwner,
                                            CameraSelector.DEFAULT_BACK_CAMERA,
                                            preview,
                                            analysis,
                                        )
                                    }.onFailure {
                                        error = it.message ?: "No se pudo iniciar el escaner."
                                    }
                                },
                                executor,
                            )
                        }
                    },
                )

                if (error != null) {
                    ErrorBox(error!!)
                }
            }
        }
    }
}

@Composable
fun CloseCaptureReviewCard(
    draft: HourmeterCaptureDraft,
    minimum: String,
    onRetake: () -> Unit,
    onSave: (String, String?, String, String) -> Unit,
) {
    var confirmed by remember(draft) { mutableStateOf(draft.confirmedValue) }
    val validation = readingError(confirmed, minimum, false)

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            CapturedPhotoPreviewCard(draft.photoPath)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ReadingBox("Inicial", minimum, Modifier.weight(1f))
                ReadingBox("Fecha/hora", displayDateTime(draft.dateTime), Modifier.weight(1f))
            }
            AppTextField("Valor confirmado", confirmed, {
                confirmed = it
            }, KeyboardType.Decimal)
            if (validation != null) ErrorBox(validation)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, AppGreen),
                    onClick = onRetake,
                ) {
                    Text("Repetir", color = AppGreenDark, fontWeight = FontWeight.Black)
                }
                Button(
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    enabled = validation == null,
                    colors = ButtonDefaults.buttonColors(containerColor = AppGreen),
                    shape = RoundedCornerShape(16.dp),
                    onClick = { onSave(confirmed.replace(',', '.'), null, draft.dateTime, draft.photoPath) },
                ) {
                    Text("Guardar cierre", fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
fun CloseScreen(
    registrationType: RegistrationType,
    pending: List<HourmeterRecord>,
    vehicles: List<Vehicle>,
    localRecords: List<LocalHourmeterRecord>,
    onRefresh: () -> Unit,
    onSendPending: () -> Unit,
    onCloseLocal: (String, String, String?, String, String?) -> Unit,
    onClose: (Int, String, String?, String, String?) -> Unit,
) {
    val localPendingSend = localRecords.any { it.status == "PENDIENTE_ENVIO" || it.status == "PENDIENTE_ENVIO_CIERRE" }
    val localPendingClose = localRecords.filter { it.finalConfirmed.isNullOrBlank() }
    val localServerIds = localRecords.mapNotNull { it.serverId }.toSet()
    val remotePending = pending.filterNot { it.id in localServerIds }
    val photoRequired = registrationType == RegistrationType.TRACTORS

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.weight(1f)) {
                FormTitle("Pendientes de cierre", "${remotePending.size + localPendingClose.size} registros en jornada.", Icons.Filled.AccessTime)
            }
            OutlinedButton(onClick = onRefresh) {
                Icon(Icons.Filled.Refresh, contentDescription = null, tint = AppGreenDark, modifier = Modifier.size(18.dp))
            }
        }
        if (localPendingSend) {
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppGreenDark),
                shape = RoundedCornerShape(16.dp),
                onClick = onSendPending,
            ) {
                Icon(Icons.Filled.Refresh, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Enviar pendientes", fontWeight = FontWeight.Black)
            }
        }
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .imePadding(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(bottom = 96.dp),
        ) {
            lazyItems(localPendingClose, key = { it.localId }) { record ->
                LocalPendingCard(record = record, minimum = latestLocalReference(record.vehicleId, record.initialConfirmed, vehicles, localRecords), photoRequired = photoRequired, onClose = onCloseLocal)
            }
            lazyItems(remotePending, key = { it.id }) { record ->
                PendingCard(record = record, minimum = latestLocalReference(record.vehicle?.id ?: 0, record.initial ?: "0", vehicles, localRecords), photoRequired = photoRequired, onClose = onClose)
            }
            if (remotePending.isEmpty() && localPendingClose.isEmpty()) {
                item {
                    Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5))) {
                        Row(
                            modifier = Modifier.padding(18.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = AppGreen)
                            Spacer(Modifier.width(10.dp))
                            Text(
                                "No hay equipos pendientes de cierre.",
                                color = AppGreenDark,
                                fontWeight = FontWeight.Black,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LocalPendingCard(
    record: LocalHourmeterRecord,
    minimum: String,
    photoRequired: Boolean,
    onClose: (String, String, String?, String, String?) -> Unit,
) {
    var draft by remember(record.localId) { mutableStateOf<HourmeterCaptureDraft?>(null) }
    var reading by remember { mutableStateOf("") }
    var showCamera by remember(record.localId) { mutableStateOf(false) }
    val needsSend = record.status == "PENDIENTE_ENVIO" || record.status == "PENDIENTE_ENVIO_CIERRE"
    val canClose = record.finalConfirmed.isNullOrBlank()

    if (showCamera) {
        CameraCaptureBottomSheet(
            kind = "cierre",
            onBack = { showCamera = false },
            onDetected = { detected, photoPath ->
                draft = HourmeterCaptureDraft(
                    vehicleId = record.vehicleId,
                    operatorId = record.operatorId,
                    vehicleLabel = record.vehicleLabel,
                    operatorLabel = record.operatorLabel,
                    photoPath = photoPath,
                    detectedValue = detected,
                    confirmedValue = reading,
                    dateTime = currentDateTime(),
                )
                showCamera = false
            },
        )
    }

    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(AppGreenSoft),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Speed, contentDescription = null, tint = AppGreen)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(record.vehicleLabel, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = AppText, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (!record.operatorLabel.isNullOrBlank()) {
                        Text(record.operatorLabel, color = AppMuted, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
                    }
                }
                StatePill(readableLocalStatus(record.status))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ReadingBox("Inicial", record.initialConfirmed, Modifier.weight(1f))
                ReadingBox("Final", record.finalConfirmed ?: "-", Modifier.weight(1f))
                ReadingBox("Envio", if (needsSend) "Pend." else "OK", Modifier.weight(1f))
            }
            if (canClose) {
                if (draft == null) {
                    val validation = readingError(reading, minimum, false)
                    AppTextField("Horometro de cierre", reading, { reading = it }, KeyboardType.Decimal)
                    if (reading.isNotBlank()) validation?.let { ErrorBox(it) }
                    if (!photoRequired) {
                        OutlinedButton(
                            enabled = validation == null,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(16.dp),
                            border = BorderStroke(1.dp, AppGreen),
                            onClick = { onClose(record.localId, reading.replace(',', '.'), null, currentDateTime(), null) },
                        ) {
                            Text("Guardar cierre sin foto", color = AppGreenDark, fontWeight = FontWeight.Black)
                        }
                    }
                    Button(
                        enabled = validation == null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AppGreen),
                        shape = RoundedCornerShape(16.dp),
                        onClick = { showCamera = true },
                    ) {
                        Icon(Icons.Filled.CameraAlt, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(if (photoRequired) "Capturar cierre" else "Tomar foto opcional", fontWeight = FontWeight.Black)
                    }
                } else {
                    CloseCaptureReviewCard(
                        draft = draft!!,
                        minimum = minimum,
                        onRetake = { draft = null },
                        onSave = { confirmed, ocr, dateTime, photoPath ->
                            onClose(record.localId, confirmed, ocr, dateTime, photoPath)
                            draft = null
                        },
                    )
                }
            } else {
                InfoLine("Cierre guardado localmente. Pendiente de envio al servidor.", compact = true)
            }
        }
    }
}

@Composable
fun PendingCard(
    record: HourmeterRecord,
    minimum: String,
    photoRequired: Boolean,
    onClose: (Int, String, String?, String, String?) -> Unit,
) {
    var draft by remember(record.id) { mutableStateOf<HourmeterCaptureDraft?>(null) }
    var reading by remember { mutableStateOf("") }
    var showCamera by remember(record.id) { mutableStateOf(false) }

    if (showCamera) {
        CameraCaptureBottomSheet(
            kind = "cierre",
            onBack = { showCamera = false },
            onDetected = { detected, photoPath ->
                draft = HourmeterCaptureDraft(
                    vehicleId = record.vehicle?.id ?: 0,
                    operatorId = record.operator?.id,
                    vehicleLabel = record.vehicle?.let { "${it.code} - ${it.name}" } ?: "Equipo ${record.id}",
                    operatorLabel = record.operator?.let { "${it.dni} - ${it.fullName}" },
                    photoPath = photoPath,
                    detectedValue = detected,
                    confirmedValue = reading,
                    dateTime = currentDateTime(),
                )
                showCamera = false
            },
        )
    }

    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(AppGreenSoft),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Agriculture, contentDescription = null, tint = AppGreen)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(record.vehicle?.code ?: "Equipo", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black, color = AppText)
                    Text(record.vehicle?.name ?: "", color = AppMuted, maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
                }
                StatePill(record.state)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ReadingBox("Inicial", record.initial ?: "-", Modifier.weight(1f))
                ReadingBox("Final", record.final ?: "-", Modifier.weight(1f))
                ReadingBox("Horas", record.hours ?: "-", Modifier.weight(1f))
            }
            if (draft == null) {
                val validation = readingError(reading, minimum, false)
                AppTextField("Horometro de cierre", reading, { reading = it }, KeyboardType.Decimal)
                if (reading.isNotBlank()) validation?.let { ErrorBox(it) }
                if (!photoRequired) {
                    OutlinedButton(
                        enabled = validation == null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, AppGreen),
                        onClick = { onClose(record.id, reading.replace(',', '.'), null, currentDateTime(), null) },
                    ) {
                        Text("Guardar cierre sin foto", color = AppGreenDark, fontWeight = FontWeight.Black)
                    }
                }
                Button(
                    enabled = validation == null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AppGreen),
                    shape = RoundedCornerShape(16.dp),
                    onClick = { showCamera = true },
                ) {
                    Icon(Icons.Filled.CameraAlt, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (photoRequired) "Capturar cierre" else "Tomar foto opcional", fontWeight = FontWeight.Black)
                }
            } else {
                CloseCaptureReviewCard(
                    draft = draft!!,
                    minimum = minimum,
                    onRetake = { draft = null },
                    onSave = { confirmed, ocr, dateTime, photoPath ->
                        onClose(record.id, confirmed, ocr, dateTime, photoPath)
                        draft = null
                    },
                )
            }
        }
    }
}

@Composable
fun AppBrandHeader() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 24.dp, vertical = 22.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(58.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(Color(0xFFEAF7E7)),
            contentAlignment = Alignment.Center,
        ) {
            Text("AC", color = Color(0xFF15803D), fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("AgroControl", color = Color(0xFF064E3B), fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
            Text("HOROMETROS", color = Color(0xFF64748B), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
        }
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(Color.White),
            contentAlignment = Alignment.Center,
        ) {
            Text("U", color = Color(0xFF064E3B), fontWeight = FontWeight.Black)
        }
        Spacer(Modifier.width(12.dp))
        Text("=", color = Color(0xFF0F172A), fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineSmall)
    }
}

@Composable
fun FieldIllustrationBand() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(124.dp)
            .background(Color(0xFFF1F8EC)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp)
                .align(Alignment.BottomCenter)
                .background(Color(0xFFDDF0D1)),
        )
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 18.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            Text("/////", color = Color(0xFF7FB069), fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.weight(1f))
            Column(horizontalAlignment = Alignment.End) {
                Text("AGRO", color = Color(0xFF789782), fontWeight = FontWeight.Black, style = MaterialTheme.typography.labelLarge)
                Text("CAMPO", color = Color(0xFF789782), fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
            }
        }
    }
}

@Composable
fun VehicleOptionCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val borderColor = if (selected) AppGreen else AppLine
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(112.dp)
            .border(1.5.dp, borderColor, RoundedCornerShape(22.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = if (selected) Color(0xFFF0FDF4) else Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = if (selected) 4.dp else 1.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(if (selected) AppGreen else AppGreenSoft),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = if (selected) Color.White else AppGreen, modifier = Modifier.size(30.dp))
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.Start) {
                Text(title, color = AppGreenDark, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
                Text(subtitle, color = AppMuted, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = AppGreenDark)
        }
    }
}

@Composable
fun ScheduleCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F8EC)),
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(Color.White),
                contentAlignment = Alignment.Center,
            ) {
                Text("07", color = Color(0xFF166534), fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
            }
            Spacer(Modifier.width(18.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Horario de registro inicial:", color = Color(0xFF334155), fontWeight = FontWeight.SemiBold)
                Text("7:00 a 8:00 a. m.", color = Color(0xFF166534), fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                Text("Cierre maximo: 7:30 p. m.", color = Color(0xFF166534), fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
fun ResponsibleInfoCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F8EC)),
    ) {
        Row(
            modifier = Modifier.padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(58.dp)
                    .clip(CircleShape)
                    .background(Color.White),
                contentAlignment = Alignment.Center,
            ) {
                Text("ID", color = Color(0xFF166534), fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.width(18.dp))
            Text(
                "El responsable quedara asociado a todos los registros realizados hoy.",
                color = Color(0xFF334155),
                fontWeight = FontWeight.SemiBold,
                style = MaterialTheme.typography.bodyLarge,
            )
        }
    }
}

@Composable
fun SelectionSummaryCard(label: String, value: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFEAF7E7)),
                contentAlignment = Alignment.Center,
            ) {
                Text(label.take(1), color = Color(0xFF166534), fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(label, fontWeight = FontWeight.Black, color = Color(0xFF0F172A))
                Text(value, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text("v", color = Color(0xFF064E3B), fontWeight = FontWeight.Black)
        }
    }
}

@Composable
fun InfoLine(text: String, compact: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(if (compact) 16.dp else 18.dp))
            .background(AppGreenSoft)
            .padding(horizontal = 12.dp, vertical = if (compact) 10.dp else 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(if (compact) 26.dp else 30.dp)
                .clip(CircleShape)
                .background(Color.White),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Info, contentDescription = null, tint = AppGreen, modifier = Modifier.size(if (compact) 16.dp else 18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Text(text, color = Color(0xFF334155), fontWeight = FontWeight.SemiBold, style = if (compact) MaterialTheme.typography.bodySmall else MaterialTheme.typography.bodyMedium)
    }
}

@Composable
fun OperatorFoundCard(operator: Operator) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFFECFDF5))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(CircleShape)
                .background(Color.White),
            contentAlignment = Alignment.Center,
        ) {
            Text("DNI", color = Color(0xFF166534), fontWeight = FontWeight.Black, style = MaterialTheme.typography.labelSmall)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Operario: ${operator.fullName}", color = Color(0xFF064E3B), fontWeight = FontWeight.Black)
            Text(operator.dni, color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
        }
        Text("OK", color = Color(0xFF166534), fontWeight = FontWeight.Black)
    }
}

@Composable
fun CaptureCard(registrationType: RegistrationType) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(58.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFEAF7E7)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = AppGreen)
                }
                Spacer(Modifier.width(14.dp))
                Column {
                    Text("Captura de horometro", color = Color(0xFF064E3B), fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
                    Text(
                        if (registrationType == RegistrationType.TRACTORS) {
                            "Toma una foto del horometro"
                        } else {
                            "Toma una foto clara del horometro"
                        },
                        color = Color(0xFF475569),
                    )
                }
            }
            PhotoPreviewCard("Vista previa de la foto")
            Text("OCR automatico + correccion manual", color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun PhotoPreviewCard(label: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(132.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFFF8FCF6)),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = AppGreen, modifier = Modifier.size(32.dp))
            Spacer(Modifier.height(8.dp))
            Text(label, color = Color(0xFF334155), fontWeight = FontWeight.SemiBold)
            Text("La imagen aparecera aqui", color = Color(0xFF64748B), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun CapturedPhotoPreviewCard(photoPath: String) {
    val bitmap = remember(photoPath) { BitmapFactory.decodeFile(photoPath) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        if (bitmap != null) {
            Image(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = "Foto del horometro capturada",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(190.dp)
                    .padding(12.dp)
                    .clip(RoundedCornerShape(16.dp)),
                contentScale = ContentScale.Crop,
            )
        } else {
            PhotoPreviewCard("No se pudo mostrar la foto capturada")
        }
    }
}

@Composable
fun ScheduleCaptureCard(registrationType: RegistrationType) {
    InfoLine(
        if (registrationType == RegistrationType.TRACTORS) {
            "El horometro inicial debe coincidir con el cierre del dia anterior."
        } else {
            "Solo disponible en horario permitido: 7:00 a 8:00 a. m."
        },
    )
}

@Composable
fun ManualCorrectionCard(enabled: Boolean, onToggle: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Correccion manual", modifier = Modifier.weight(1f), fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                OutlinedButton(shape = RoundedCornerShape(20.dp), onClick = onToggle) {
                    Text(if (enabled) "Activa" else "Inactiva", fontWeight = FontWeight.Black)
                }
            }
            Text(
                "Si el OCR no es exacto, puedes corregirlo manualmente. La imagen se guardara igualmente.",
                color = Color(0xFF475569),
            )
        }
    }
}

@Composable
fun <T> SelectorCard(
    label: String,
    items: List<T>,
    selectedId: Int?,
    title: (T) -> String,
    onSelected: (Int?) -> Unit,
    nullableLabel: String? = null,
) {
    Column {
        Text(label, fontWeight = FontWeight.Black, color = Color(0xFF334155))
        Spacer(Modifier.height(8.dp))
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .height(if (items.size > 3) 152.dp else 64.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (nullableLabel != null) {
                item {
                    SelectButton(nullableLabel, selectedId == null) { onSelected(null) }
                }
            }
            lazyItems(items) { item ->
                val id = when (item) {
                    is Vehicle -> item.id
                    is Operator -> item.id
                    else -> 0
                }
                SelectButton(title(item), selectedId == id) { onSelected(id) }
            }
        }
    }
}

@Composable
fun SelectButton(label: String, selected: Boolean, onClick: () -> Unit) {
    OutlinedButton(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = if (selected) Color(0xFFDCFCE7) else Color.White,
            contentColor = if (selected) Color(0xFF166534) else Color(0xFF334155),
        ),
        onClick = onClick,
    ) {
        Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Bold)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun <T> SimpleDropdownField(
    label: String,
    placeholder: String,
    selectedLabel: String?,
    items: List<T>,
    itemLabel: (T) -> String,
    onSelected: (T) -> Unit,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    emptyText: String = "Sin datos disponibles",
    searchable: Boolean = items.size > 8,
    trailingAction: (@Composable () -> Unit)? = null,
) {
    var expanded by remember(label, selectedLabel, items) { mutableStateOf(false) }
    var query by remember(label, expanded) { mutableStateOf("") }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val filteredItems = remember(items, query) {
        if (query.isBlank()) {
            items
        } else {
            items.filter { itemLabel(it).contains(query, ignoreCase = true) }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(label, fontWeight = FontWeight.Black, color = AppText, style = MaterialTheme.typography.titleSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(
                modifier = Modifier
                    .weight(1f)
                    .height(54.dp),
                enabled = enabled,
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, if (enabled) AppLine else Color(0xFFEFF3F6)),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = if (enabled) Color.White else Color(0xFFF3F6F5),
                    contentColor = AppText,
                    disabledContainerColor = Color(0xFFF3F6F5),
                ),
                onClick = { expanded = true },
                contentPadding = PaddingValues(horizontal = 14.dp),
            ) {
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    if (icon != null) {
                        Icon(icon, contentDescription = null, tint = if (enabled) AppGreen else Color(0xFFCBD5E1), modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(10.dp))
                    }
                    Text(
                        selectedLabel ?: placeholder,
                        modifier = Modifier.weight(1f),
                        color = if (!enabled) Color(0xFFCBD5E1) else if (selectedLabel == null) AppMuted else AppText,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Icon(
                        Icons.Filled.KeyboardArrowDown,
                        contentDescription = null,
                        tint = if (enabled) AppGreenDark else Color(0xFFCBD5E1),
                    )
                }
            }
            if (trailingAction != null) {
                trailingAction()
            }
        }

        if (expanded && enabled) {
            ModalBottomSheet(
                onDismissRequest = { expanded = false },
                sheetState = sheetState,
                containerColor = Color.White,
                dragHandle = null,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.95f)
                        .padding(horizontal = 18.dp, vertical = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(label, color = AppText, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                            Text("${items.size} opciones disponibles", color = AppMuted, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
                        }
                        IconButton(onClick = { expanded = false }) {
                            Icon(Icons.Filled.Close, contentDescription = "Cerrar", tint = AppGreenDark)
                        }
                    }
                    if (searchable) {
                        AppTextField("Buscar", query, { query = it })
                    }
                    if (filteredItems.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                if (items.isEmpty()) emptyText else "No hay resultados para la busqueda.",
                                color = Color(0xFF64748B),
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            lazyItems(filteredItems) { item ->
                                TextButton(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(52.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(Color(0xFFF8FAFC)),
                                    onClick = {
                                        onSelected(item)
                                        expanded = false
                                    },
                                ) {
                                    Text(
                                        itemLabel(item),
                                        modifier = Modifier.fillMaxWidth(),
                                        color = AppText,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AppTextField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
) {
    OutlinedTextField(
        modifier = Modifier.fillMaxWidth(),
        value = value,
        onValueChange = { input ->
            if (keyboardType == KeyboardType.Decimal || keyboardType == KeyboardType.Number) {
                onChange(normalizeNumericInput(input))
            } else {
                onChange(input)
            }
        },
        label = { Text(label, style = MaterialTheme.typography.bodySmall) },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
        singleLine = true,
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = AppGreen,
            unfocusedBorderColor = AppLine,
            focusedLabelColor = AppGreenDark,
            cursorColor = AppGreen,
            focusedContainerColor = Color.White,
            unfocusedContainerColor = Color.White,
        ),
    )
}

private fun normalizeNumericInput(value: String): String {
    var hasSeparator = false
    val sanitized = StringBuilder()

    value.forEach { char ->
        when {
            char.isDigit() -> sanitized.append(char)
            (char == '.' || char == ',') && !hasSeparator -> {
                sanitized.append(char)
                hasSeparator = true
            }
        }
    }

    return sanitized.toString()
}

private fun LocationOption.label(): String {
    return if (code.isBlank()) name else "$code - $name"
}

@Composable
fun TabButton(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        modifier = modifier.height(42.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selected) Color.White else Color.Transparent,
            contentColor = if (selected) AppGreenDark else AppMuted,
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = if (selected) 2.dp else 0.dp),
        onClick = onClick,
    ) {
        Icon(if (label == "Inicio") Icons.Filled.Speed else Icons.Filled.AccessTime, contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text(label, fontWeight = FontWeight.Black, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
fun ReadingBox(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White)
            .border(1.dp, AppLine, RoundedCornerShape(14.dp))
            .padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(value.ifBlank { "-" }, fontWeight = FontWeight.Black, color = AppText, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
fun StatePill(value: String) {
    val normalized = value.uppercase()
    val color = when {
        normalized.contains("CIERRE") || normalized == "EN_JORNADA" -> Color(0xFF0369A1)
        normalized.contains("ENVIO") -> Color(0xFFB45309)
        normalized.contains("CERRADO") || normalized.contains("ENVIADO") -> AppGreen
        normalized.contains("INCONSISTENCIA") || normalized.contains("OBSERVADO") -> Color(0xFFBE123C)
        else -> Color(0xFFB45309)
    }
    Text(
        value.replace("_", " "),
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        color = color,
        fontWeight = FontWeight.Black,
        style = MaterialTheme.typography.labelSmall,
    )
}

@Composable
fun ErrorBox(message: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFFFFF1F2))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.Close, contentDescription = null, tint = Color(0xFFBE123C), modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(message, color = Color(0xFFBE123C), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun SuccessBox(message: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFFECFDF5))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = AppGreen, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(message, color = AppGreenDark, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
    }
}

private fun defaultDateTime(hour: String): String {
    val normalizedHour = if (hour.count { it == ':' } == 1) "$hour:00" else hour

    return "${LocalDate.now()}T$normalizedHour"
}

private fun currentDateTime(): String {
    return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"))
}

private fun displayDateTime(value: String?): String {
    if (value.isNullOrBlank()) {
        return "-"
    }

    return runCatching {
        LocalDateTime.parse(normalizeDateTimeForParsing(value)).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"))
    }.getOrElse { value.replace("T", " ") }
}

private fun displayDate(value: String?): String {
    return displayDateTime(value).substringBefore(" ")
}

private fun displayTime(value: String?): String {
    return displayDateTime(value).substringAfter(" ", "-")
}

private fun normalizeDateTimeForParsing(value: String): String {
    val normalized = value.trim().replace(" ", "T")

    return if (normalized.count { it == ':' } == 1) "${normalized}:00" else normalized
}

private fun photoReference(kind: String, id: Int): String {
    val timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
    return "android/horometros/${LocalDate.now()}/$id/$kind-$timestamp.jpg"
}

private fun createEvidenceFile(root: File, kind: String): File {
    val directory = File(root, "horometros/${LocalDate.now()}").apply { mkdirs() }
    val timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"))

    return File(directory, "$kind-$timestamp.jpg")
}

private fun encodeFileAsBase64(path: String): String {
    return Base64.encodeToString(File(path).readBytes(), Base64.NO_WRAP)
}

@Preview(showBackground = true)
@Composable
fun HorometroPreview() {
    HorometroTheme {
        HorometroApp()
    }
}


private fun compressEvidence(file: File) {
    val orientation = android.media.ExifInterface(file.absolutePath)
        .getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, 1)
    val bounds = android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds = true }
    android.graphics.BitmapFactory.decodeFile(file.absolutePath, bounds)
    val options = android.graphics.BitmapFactory.Options()
    while (maxOf(bounds.outWidth, bounds.outHeight) / options.inSampleSize.coerceAtLeast(1) > 2560) {
        options.inSampleSize = options.inSampleSize.coerceAtLeast(1) * 2
    }
    val bitmap = android.graphics.BitmapFactory.decodeFile(file.absolutePath, options)
        ?: error("No se pudo procesar la foto.")
    val matrix = android.graphics.Matrix().apply {
        when (orientation) {
            2 -> setScale(-1f, 1f)
            3 -> setRotate(180f)
            4 -> setScale(1f, -1f)
            5 -> { setRotate(90f); postScale(-1f, 1f) }
            6 -> setRotate(90f)
            7 -> { setRotate(270f); postScale(-1f, 1f) }
            8 -> setRotate(270f)
        }
    }
    val oriented = android.graphics.Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    val scale = minOf(1f, 1600f / maxOf(oriented.width, oriented.height))
    val resized = android.graphics.Bitmap.createScaledBitmap(oriented, (oriented.width * scale).toInt(), (oriented.height * scale).toInt(), true)
    val temporary = File(file.parentFile, "${file.name}.compressed")
    try {
        temporary.outputStream().use { check(resized.compress(android.graphics.Bitmap.CompressFormat.JPEG, 75, it)) }
        java.nio.file.Files.move(temporary.toPath(), file.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING)
    } finally {
        if (resized !== oriented) resized.recycle()
        if (oriented !== bitmap) oriented.recycle()
        bitmap.recycle()
        temporary.delete()
    }
}
