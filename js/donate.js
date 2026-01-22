(() => {
    const form = document.querySelector(".donate-form");
    if (!form) {
        return;
    }

    const amountRadios = Array.from(form.querySelectorAll('input[name="donation-amount"]'));
    const frequencyRadios = Array.from(form.querySelectorAll('input[name="donation-frequency"]'));
    const customAmountInput = form.querySelector("#custom-amount");
    const submitButton = form.querySelector('button[type="submit"]');
    const statusAlert = form.querySelector("#donate-status");

    if (statusAlert) {
        const params = new URLSearchParams(window.location.search);
        if (params.has("success")) {
            statusAlert.textContent = "Thank you! Your donation was successful.";
            statusAlert.classList.remove("d-none", "alert-danger");
            statusAlert.classList.add("alert-success");
        } else if (params.has("canceled")) {
            statusAlert.textContent = "Payment canceled. You can try again anytime.";
            statusAlert.classList.remove("d-none", "alert-success");
            statusAlert.classList.add("alert-danger");
        }
    }

    const getSelectedFrequency = () => {
        const selected = frequencyRadios.find((radio) => radio.checked);
        return selected ? selected.value : "one_time";
    };

    const getSelectedAmount = () => {
        const customValue = customAmountInput ? customAmountInput.value.trim() : "";
        if (customValue) {
            return Number(customValue);
        }

        const selected = amountRadios.find((radio) => radio.checked);
        return selected ? Number(selected.value) : 0;
    };

    if (customAmountInput) {
        customAmountInput.addEventListener("input", () => {
            if (customAmountInput.value.trim()) {
                amountRadios.forEach((radio) => {
                    radio.checked = false;
                });
            }
        });
    }

    amountRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (radio.checked && customAmountInput) {
                customAmountInput.value = "";
            }
        });
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const amount = getSelectedAmount();
        if (!Number.isFinite(amount) || amount <= 0) {
            window.alert("Please select or enter a valid donation amount.");
            return;
        }

        const payload = {
            amount,
            frequency: getSelectedFrequency(),
            name: form.querySelector("#donation-name")?.value.trim(),
            email: form.querySelector("#donation-email")?.value.trim(),
        };

        const originalLabel = submitButton ? submitButton.textContent : "";
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Redirecting...";
        }

        try {
            const response = await fetch("/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok || !data.url) {
                throw new Error(data.error || "Unable to start payment.");
            }

            window.location.href = data.url;
        } catch (error) {
            window.alert(error.message || "Something went wrong. Please try again.");
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalLabel;
            }
        }
    });
})();
