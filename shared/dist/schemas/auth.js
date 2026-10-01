"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.resendVerificationSchema = exports.verifyEmailSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = exports.emailSchema = exports.passwordSchema = void 0;
exports.scorePassword = scorePassword;
const zod_1 = require("zod");
const constants_1 = require("../constants");
exports.passwordSchema = zod_1.z
    .string()
    .min(constants_1.PASSWORD_RULES.minLength, `Password must be at least ${constants_1.PASSWORD_RULES.minLength} characters`)
    .max(constants_1.PASSWORD_RULES.maxLength, `Password must be at most ${constants_1.PASSWORD_RULES.maxLength} characters`)
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number");
exports.emailSchema = zod_1.z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(254)
    .email("Enter a valid email address");
exports.registerSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(60),
    email: exports.emailSchema,
    password: exports.passwordSchema,
    confirmPassword: zod_1.z.string(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: exports.emailSchema,
});
exports.resetPasswordSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(20, "Reset link is invalid or incomplete"),
    password: exports.passwordSchema,
    confirmPassword: zod_1.z.string(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().min(20, "Verification link is invalid or incomplete"),
});
exports.resendVerificationSchema = zod_1.z.object({
    email: exports.emailSchema,
});
exports.changePasswordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    password: exports.passwordSchema,
    confirmPassword: zod_1.z.string(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
function scorePassword(password) {
    let score = 0;
    if (password.length >= constants_1.PASSWORD_RULES.minLength)
        score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password))
        score++;
    if (/[0-9]/.test(password))
        score++;
    if (/[^A-Za-z0-9]/.test(password) && password.length >= 14)
        score++;
    const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
    const clamped = Math.min(score, 4);
    return { score: clamped, label: labels[clamped] };
}
//# sourceMappingURL=auth.js.map