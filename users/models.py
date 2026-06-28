import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, full_name, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, full_name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('guest', 'Guest'),
        ('host', 'Host'),
        ('admin', 'Admin'),
    ]
    ID_DOCUMENT_CHOICES = [
        ('national_id', 'National ID'),
        ('passport', 'Passport'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='guest')
    guest_average_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    guest_rating_count = models.IntegerField(default=0)

    # Identity document — one time upload, ID or Passport
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.full_name} ({self.email}) — {self.role}'


class HostProfile(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]
    TRUST_CHOICES = [
        ('probation', 'Probation'),
        ('verified', 'Verified'),
        ('physically_verified', 'Physically Verified'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='host_profile')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    trust_level = models.CharField(max_length=25, choices=TRUST_CHOICES, default='probation')
    rejection_reason = models.TextField(null=True, blank=True)
    completed_bookings_count = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    caretaker_name = models.CharField(max_length=255, null=True, blank=True)
    caretaker_phone = models.CharField(max_length=20, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_hosts'
    )

    class Meta:
        ordering = ['-approved_at']

    def __str__(self):
        return f'HostProfile — {self.user.full_name} ({self.status})'