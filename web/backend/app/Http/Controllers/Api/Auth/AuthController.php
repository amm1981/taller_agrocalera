<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();
        $identifier = $credentials['usuario'] ?? $credentials['email'];

        $user = User::query()
            ->where('username', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Las credenciales no son válidas.',
                'errors' => [
                    'usuario' => ['Usuario o contraseña incorrectos.'],
                ],
                'code' => 'INVALID_CREDENTIALS',
            ], 422);
        }

        if ($user->status !== 'ACTIVO') {
            return response()->json([
                'message' => 'El usuario no está activo.',
                'errors' => [],
                'code' => 'USER_INACTIVE',
            ], 403);
        }

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        $token = $user
            ->createToken($credentials['device_name'] ?? 'agrocontrol-client')
            ->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            ...$this->authenticatedUserPayload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(
            $this->authenticatedUserPayload($request->user())
        );
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    /**
     * @return array{user: User, roles: array<int, string>, permissions: array<int, string>}
     */
    private function authenticatedUserPayload(User $user): array
    {
        return [
            'user' => $user,
            'roles' => $user->getRoleNames()->values()->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
        ];
    }
}
