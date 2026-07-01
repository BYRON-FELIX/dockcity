from django.db import migrations, models


def seed_amenities(apps, schema_editor):
    Amenity = apps.get_model('listings', 'Amenity')

    default_amenities = [
        ('WiFi', 'both', 1),
        ('Parking', 'both', 2),
        ('Swimming Pool', 'both', 3),
        ('Gym', 'both', 4),
        ('Generator', 'both', 5),
        ('Air Conditioning', 'both', 6),
        ('DSTV', 'both', 7),
        ('Security', 'both', 8),
        ('Balcony', 'both', 9),
        ('Kitchen', 'both', 10),
        ('Washing Machine', 'both', 11),
        ('Hot Water', 'both', 12),
        ('Study Desk', 'both', 13),
        ('Smart TV', 'both', 14),
        ('Garden', 'property', 15),
        ('Servant Quarter', 'property', 16),
        ('Borehole', 'property', 17),
        ('Solar', 'property', 18),
        ('Elevator', 'property', 19),
    ]

    for name, applies_to, sort_order in default_amenities:
        Amenity.objects.update_or_create(
            name=name,
            defaults={
                'applies_to': applies_to,
                'sort_order': sort_order,
                'is_active': True,
            },
        )


def noop_reverse(apps, schema_editor):
    # Keep seeded amenities on rollback to avoid losing admin-managed data.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('listings', '0009_listing_long_stay_discounts'),
    ]

    operations = [
        migrations.CreateModel(
            name='Amenity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('applies_to', models.CharField(choices=[('listing', 'Listing'), ('property', 'Property For Sale'), ('both', 'Both')], default='both', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['sort_order', 'name'],
            },
        ),
        migrations.RunPython(seed_amenities, noop_reverse),
    ]
