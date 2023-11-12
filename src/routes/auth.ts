// Dependencies
import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";
import { cookie } from "@elysiajs/cookie";

const prisma = new PrismaClient();

const app = new Elysia();

app.group("/auth", (app) =>
  app
    .use(cookie())
    .post(
      "/register",
      async ({ body }) => {
        // Search User from email
        let user = await prisma.user.findFirst({
          where: {
            email: body.email,
          },
          select: {
            email: true,
            name: true,
          },
        });

        // Return an error if user exists
        if (user) {
          return {
            status: false,
            message: "An User Already Exist This Email",
          };
        }

        const hash = await Bun.password.hash(body.password);
        // return hash;

        // Create User if not exists
        user = await prisma.user.create({
          data: {
            name: body.name,
            email: body.email,
            password: hash,
            joined_at: new Date(),
            role_id: body.role_id,
          },
        });

        // Resurn user
        return {
          status: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role_id,
          },
        };
      },
      {
        body: t.Object({
          name: t.String(),
          email: t.String(),
          password: t.String(),
          role_id: t.Integer(),
        }),
      }
    )
    .post(
      "/login",
      async ({ body, setCookie }) => {
        // Search User From Email
        const user = await prisma.user.findFirst({
          where: {
            email: body.email,
          },
        });
        if (user) {
          // If User found, verify password
          if (await Bun.password.verify(body.password, user.password)) {
            // Store User Informations in COOKIE Securly
            const _token = {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role_id,
            };

            setCookie("_token", JSON.stringify(_token), {
              secure: true,
            });
            return {
              status: true,
              user: _token,
            };
          }
        }

        return {
          status: false,
          message: "Invalid Login Credentials",
        };
      },
      {
        body: t.Object({
          email: t.String(),
          password: t.String(),
        }),
      }
    )
);

export default app;
