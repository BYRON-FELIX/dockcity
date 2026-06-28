from django.core.management.base import BaseCommand
from django.db.models import Avg

from reviews.models import Review
from users.models import User


class Command(BaseCommand):
    help = "Backfill host and guest aggregate ratings from visible reviews."

    def handle(self, *args, **options):
        # Reset guest aggregates before recomputing from visible reviews.
        User.objects.update(guest_average_rating=None, guest_rating_count=0)

        host_updated = 0
        guest_updated = 0

        for user in User.objects.all():
            reviews_qs = Review.objects.filter(reviewee=user, is_visible=True)
            avg = reviews_qs.aggregate(Avg("rating"))["rating__avg"]
            count = reviews_qs.count()

            if user.role == "host" and hasattr(user, "host_profile"):
                user.host_profile.average_rating = round(avg, 2) if avg else 0
                user.host_profile.save(update_fields=["average_rating"])
                host_updated += 1
            else:
                user.guest_average_rating = round(avg, 2) if avg else None
                user.guest_rating_count = count
                user.save(update_fields=["guest_average_rating", "guest_rating_count"])
                guest_updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Backfill complete. Hosts updated: {host_updated}, guests/users updated: {guest_updated}."
        ))
