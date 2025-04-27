import * as z from "zod"

export const LoginSchema =   z.object({
    email : z.string().email(),
    password: z.string().min(1,"Password must have atleast 6 letters.")
})


export const RegisterSchema =   z.object({
    name:z.string().min(1,"Name is required !"),
    email : z.string().email(),
    password: z.string().min(6,"Password must have atleast 6 letters."),
    confirmPassword: z.string().min(6),
}) .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirm"],
});

