#!/usr/bin/env node
import { validateDependencies } from "./index.js";

console.log("🔍 Running auto-dependency-validator...\n");

validateDependencies()
    ?.then((result) => {
        const { unused, missing, mismatched } = result;

        if (unused?.length) {
            console.log("⚠️ Unused Dependencies:");
            unused?.forEach((dep) => console.log("  •", dep));
            console.log();
        };

        if (missing?.length) {
            console.log("🚫 Missing Dependencies:");
            missing?.forEach((dep) => console.log("  •", dep));
            console.log();
        };

        if (mismatched?.length) {
            console.log("🔁 Mismatched Versions:");
            mismatched?.forEach((dep) => console.log("  •", dep));
            console.log();
        };

        if (!unused?.length && !missing?.length && !mismatched?.length) {
            console.log("✅ All dependencies look clean!");
        };
    })
    ?.catch((err) => {
        console.error("❌ Error:", err?.message || err,);
    });