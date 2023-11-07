'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';

const InvoiceSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer',
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};
const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {

    // Validate the form using Zod.
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    
    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        console.log(validatedFields);
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing fields. Failed to create invoice.',
        };
    }

    // Prepare data for insertion into the database.
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = Math.round(amount * 100);
    const date = new Date().toISOString().split('T')[0];

    try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

}

const UpdateInvoice = InvoiceSchema.omit({ date: true, id: true});

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
    console.log(prevState);
    console.log(id);
    console.log(formData);

    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    console.log(validatedFields);

    if (!validatedFields.success) {
        console.log(validatedFields);
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing fields. Failed to update invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = Math.round(amount * 100);

    try {
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
        `;
    } catch (error) {
        console.log(`Error: ${error}`);
        return {
            message: 'Database Error: Failed to Update Invoice.',
        };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    throw new Error('Failed to delete invoice');

    try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Delete Invoice.',
        };
    }
    revalidatePath('/dashboard/invoices');
}


export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', Object.fromEntries(formData));
    } catch (error) {
        if ((error as Error).message.includes('CredentialsSignin')) {
            return 'CredentialsSignin';
        }
        throw error;
    }
}










